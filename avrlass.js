var AVRLASS = new function(){let that = this;
  let device = {
    name:'',
    instr_set:'any',
    flash_bytes:0,
    ram_start:0x60,
  }
  let keywords = [
    '.EQU','.INCLUDE','.CSEG','.DSEG','.ESEG','.BYTE','.DB','.DW','.DD','.DQ','.ORG','.MACRO','.ENDM','.ENDMACRO','.MESSAGE','.ERROR','.WARNING','.DEVICE','.EXIT','.IF','.ENDIF','.ELSE','.ELIF','.IFDEF','.IFNDEF',
    'ADC','ADD','ADIW','AND','ANDI','ASR',
    'BCLR','BLD','BRBC','BRBS','BRCC','BRCS','BREAK','BREQ','BRGE','BRHC','BRHS','BRID','BRIE','BRLO','BRLT','BRMI','BRNE','BRPL','BRSH','BRTC','BRTS','BRVC','BRVS','BSET','BST',
    'CALL','CBI','CBR','CLC','CLH','CLI','CLN','CLR','CLS','CLT','CLV','CLZ','COM','CP','CPC','CPI','CPSE',
    'DEC','DES','EICALL','EIJMP','ELPM','EOR',
    'FMUL','FMULS','FMULSU',
    'ICALL','IJMP','IN','INC','JMP',
    'LAC','LAS','LAT','LD','LDD','LDI','LDS','LPM','LSL','LSR',
    'MOV','MOVW','MUL','MULS','MULSU',
    'NEG','NOP','OR','ORI','OUT',
    'POP','PUSH','RCALL','RET','RETI','RJMP','ROL','ROR',
    'SBC','SBCI','SBI','SBIC','SBIS','SBIW','SBR','SBRC','SBRS','SEC','SEH','SEI','SEN','SER','SES','SET','SEV','SEZ','SLEEP','SPM','ST','STD','STS','SUB','SUBI','SWAP',
    'TST','WDR','XCH',
  ];
  let missing = {
    'ADIW'   :'c',
    'BREAK'  :'r',
    'DES'    :'rc',
    'EICALL' :'rec',
    'EIJMP'  :'rec',
    'ELPM'   :'rec',
    'ELPM.Z' :'rec',
    'ELPM.Z+':'rec',
    'FMUL'   :'rec',
    'FMULS'  :'rec',
    'FMULSU' :'rec',
    'JMP'    :'rc',
    'LAC'    :'re+tc',
    'LAS'    :'re+tc',
    'LAT'    :'re+tc',
    'LDD.Y'  :'c',
    'LDD.Z'  :'c',
    'LPM'    :'c',
    'LPM.Z'  :'rc',
    'LPM.Z+' :'rc',
    'MOVW'   :'rc',
    'MUL'    :'rec',
    'MULS'   :'rec',
    'MULSU'  :'rec',
    'SBIW'   :'c',
    'SPM'    :'rc',
    'SPM.Z+' :'re+c',
    'SPM.Z+' :'re+xc',
  }
  function op_len(op){
    return {
      'JMP':4,
      'CALL':4,
      'LDS':4,
      'STS':4
    }[op] || 2;
  }

  function op_encode(pc,op,oo){
    function op_tmpl(tmpl_in,keys){
      let tmpl = tmpl_in.split('').reverse();
      for (let k in keys){
        // console.log(k,keys[k])
        let bin = keys[k].toString(2).split('').reverse().concat(new Array(32).fill(0));
        for (let j = 0; j < tmpl.length; j++){
          if (tmpl[j] == k){
            tmpl[j] = bin.shift();
          }
        }
        if (bin[0]){
          throw `(${pc}) ${op} operand out of range: ${k}=${keys[k]} in ${tmpl_in}`;
        }
      }
      let n = eval('0b'+tmpl.reverse().join(''));
      if (n > 65535){
        return [ (n>>16)&0xff, (n>>24)&0xff, n&0xff, (n>>8)&0xff];
      }else{
        return [ n&0xff, (n>>8)&0xff]
      } 
    }

    let o0 = oo[0];
    let o1 = oo[1];

    let com2 = (x,n)=>(x+(n*2)*(x<0))
    let rdist = (k,n)=>{
      // console.log(k,pc,n)
      k--;
      if (device.flash_bytes <= 0 || k-pc >= -n || k-pc < n){
        return com2(k-pc,n);
      }else if (k > pc){
        k -= device.flash_bytes>>1;
      }else{
        k += device.flash_bytes>>1;
      }
      return com2(k-pc,n);
    }
    switch (op){
      case 'ADC'    :return op_tmpl('0001_11rd_dddd_rrrr',{d:o0,r:o1});
      case 'ADD'    :return op_tmpl('0000_11rd_dddd_rrrr',{d:o0,r:o1});
      case 'ADIW'   :return op_tmpl('1001_0110_KKdd_KKKK',{d:(o0-24)/2,K:o1});
      case 'AND'    :return op_tmpl('0010_00rd_dddd_rrrr',{d:o0,r:o1});
      case 'ANDI'   :return op_tmpl('0111_KKKK_dddd_KKKK',{d:o0-16,K:o1});
      case 'ASR'    :return op_tmpl('1001_010d_dddd_0101',{d:o0});
      case 'BCLR'   :return op_tmpl('1001_0100_1sss_1000',{s:o0});
      case 'BLD'    :return op_tmpl('1111_100d_dddd_0bbb',{d:o0,b:o1});
      case 'BRBC'   :return op_tmpl('1111_01kk_kkkk_ksss',{s:o0,k:rdist(o1,64)});
      case 'BRBS'   :return op_tmpl('1111_00kk_kkkk_ksss',{s:o0,k:rdist(o1,64)});
      case 'BRCC'   :return op_encode(pc,'BRBC',[0,o0]);
      case 'BRCS'   :return op_encode(pc,'BRBS',[0,o0]);
      case 'BREAK'  :return op_tmpl('1001_0101_1001_1000',{});
      case 'BREQ'   :return op_encode(pc,'BRBS',[1,o0]);
      case 'BRGE'   :return op_encode(pc,'BRBC',[4,o0]);
      case 'BRHC'   :return op_encode(pc,'BRBC',[5,o0]);
      case 'BRHS'   :return op_encode(pc,'BRBS',[5,o0]);
      case 'BRID'   :return op_encode(pc,'BRBC',[7,o0]);
      case 'BRIE'   :return op_encode(pc,'BRBS',[7,o0]);
      case 'BRLO'   :return op_encode(pc,'BRBS',[0,o0]);
      case 'BRLT'   :return op_encode(pc,'BRBS',[4,o0]);
      case 'BRMI'   :return op_encode(pc,'BRBS',[2,o0]);
      case 'BRNE'   :return op_encode(pc,'BRBC',[1,o0]);
      case 'BRPL'   :return op_encode(pc,'BRBC',[2,o0]);
      case 'BRSH'   :return op_encode(pc,'BRCC',oo);
      case 'BRTC'   :return op_encode(pc,'BRBC',[6,o0]);
      case 'BRTS'   :return op_encode(pc,'BRBS',[6,o0]);
      case 'BRVC'   :return op_encode(pc,'BRBC',[3,o0]);
      case 'BRVS'   :return op_encode(pc,'BRBS',[3,o0]);
      case 'BSET'   :return op_tmpl('1001_0100_0sss_1000',{s:o0});
      case 'BST'    :return op_tmpl('1001_101d_dddd_0bbb',{d:o0,b:o1});
      case 'CALL'   :return op_tmpl('1001_010k_kkkk_111k_kkkk_kkkk_kkkk_kkkk',{k:o0});
      case 'CBI'    :return op_tmpl('1001_1000_AAAA_Abbb',{A:o0,b:o1});
      case 'CBR'    :return op_encode(pc,'ANDI',[o0,0xFF-o1]);
      case 'CLC'    :return op_encode(pc,'BCLR',[0]);
      case 'CLH'    :return op_encode(pc,'BCLR',[5]);
      case 'CLI'    :return op_encode(pc,'BCLR',[7]);
      case 'CLN'    :return op_encode(pc,'BCLR',[2]);
      case 'CLR'    :return op_encode(pc,'EOR',[o0,o0]);
      case 'CLS'    :return op_encode(pc,'BCLR',[4]);
      case 'CLT'    :return op_encode(pc,'BCLR',[6]);
      case 'CLV'    :return op_encode(pc,'BCLR',[3]);
      case 'CLZ'    :return op_encode(pc,'BCLR',[1]);
      case 'COM'    :return op_tmpl('1001_010d_dddd_0000',{d:o0});
      case 'CP'     :return op_tmpl('0001_01rd_dddd_rrrr',{d:o0,r:o1});
      case 'CPC'    :return op_tmpl('0000_01rd_dddd_rrrr',{d:o0,r:o1});
      case 'CPI'    :return op_tmpl('0011_KKKK_dddd_KKKK',{d:o0-16,K:com2(o1,128)});
      case 'CPSE'   :return op_tmpl('0001_00rd_dddd_rrrr',{d:o0,r:o1});
      case 'DEC'    :return op_tmpl('1001_010d_dddd_1010',{d:o0});
      case 'DES'    :return op_tmpl('1001_0100_KKKK_1011',{K:o0});
      case 'EICALL' :return op_tmpl('1001_0101_0001_1001',{});
      case 'EIJMP'  :return op_tmpl('1001_0100_0001_1001',{});
      case 'ELPM'   :return op_tmpl('1001_0101_1101_1000',{});
      case 'ELPM.Z' :return op_tmpl('1001_000d_dddd_0110',{d:o0});
      case 'ELPM.Z+':return op_tmpl('1001_000d_dddd_0111',{d:o0});
      case 'EOR'    :return op_tmpl('0010_01rd_dddd_rrrr',{d:o0,r:o1});
      case 'FMUL'   :return op_tmpl('0000_0011_0ddd_1rrr',{d:o0-16,r:o1-16});
      case 'FMULS'  :return op_tmpl('0000_0011_1ddd_0rrr',{d:o0-16,r:o1-16});
      case 'FMULSU' :return op_tmpl('0000_0011_1ddd_1rrr',{d:o0-16,r:o1-16});
      case 'ICALL'  :return op_tmpl('1001_0101_0000_1001',{});
      case 'IJMP'   :return op_tmpl('1001_0100_0000_1001',{});
      case 'IN'     :return op_tmpl('1011_0AAd_dddd_AAAA',{d:o0,A:o1});
      case 'INC'    :return op_tmpl('1001_010d_dddd_0011',{d:o0});
      case 'JMP'    :return op_tmpl('1001_010k_kkkk_110k_kkkk_kkkk_kkkk_kkkk',{k:o0});
      case 'LAC'    :return op_tmpl('1001_001r_rrrr_0110',{r:o1});
      case 'LAS'    :return op_tmpl('1001_001r_rrrr_0101',{r:o1});
      case 'LAT'    :return op_tmpl('1001_001r_rrrr_0111',{r:o1});
      case 'LD.X'   :return op_tmpl('1001_000d_dddd_1100',{d:o0});
      case 'LD.X+'  :return op_tmpl('1001_000d_dddd_1101',{d:o0});
      case 'LD.-X'  :return op_tmpl('1001_000d_dddd_1110',{d:o0});
      case 'LD.Y'   :return op_tmpl('1000_000d_dddd_1000',{d:o0});
      case 'LD.Y+'  :return op_tmpl('1001_000d_dddd_1001',{d:o0});
      case 'LD.-Y'  :return op_tmpl('1001_000d_dddd_1010',{d:o0});
      case 'LDD.Y'  :return op_tmpl('10q0_qq0d_dddd_1qqq',{d:o0,q:o1});
      case 'LD.Z'   :return op_tmpl('1000_000d_dddd_0000',{d:o0});
      case 'LD.Z+'  :return op_tmpl('1001_000d_dddd_0001',{d:o0});
      case 'LD.-Z'  :return op_tmpl('1001_000d_dddd_0010',{d:o0});
      case 'LDD.Z'  :return op_tmpl('10q0_qq0d_dddd_0qqq',{d:o0,q:o1});
      case 'LDI'    :return op_tmpl('1110_KKKK_dddd_KKKK',{d:o0-16,K:com2(o1,128)});
      case 'LDS'    :return op_tmpl('1001_000d_dddd_0000_kkkk_kkkk_kkkk_kkkk',{d:o0,k:o1});
      case 'LDS.RC' :return op_tmpl('1010_0kkk_dddd_kkkk',{d:o0-16,k:o1});
      case 'LPM'    :return op_tmpl('1001_0101_1100_1000',{});
      case 'LPM.Z'  :return op_tmpl('1001_000d_dddd_0100',{d:o0});
      case 'LPM.Z+' :return op_tmpl('1001_000d_dddd_0101',{d:o0});
      case 'LSL'    :return op_encode(pc,'ADD',[o0,o0]);
      case 'LSR'    :return op_tmpl('1001_010d_dddd_0110',{d:o0});
      case 'MOV'    :return op_tmpl('0010_11rd_dddd_rrrr',{d:o0,r:o1});
      case 'MOVW'   :return op_tmpl('0000_0001_dddd_rrrr',{d:o0/2,r:o1/2});
      case 'MUL'    :return op_tmpl('1001_11rd_dddd_rrrr',{d:o0,r:o1});
      case 'MULS'   :return op_tmpl('0000_0010_dddd_rrrr',{d:o0-16,r:o1-16});
      case 'MULSU'  :return op_tmpl('0000_0011_0ddd_0rrr',{d:o0-16,r:o1-16});
      case 'NEG'    :return op_tmpl('1001_010d_dddd_0001',{d:o0});
      case 'NOP'    :return op_tmpl('0000_0000_0000_0000',{});
      case 'OR'     :return op_tmpl('0010_10rd_dddd_rrrr',{d:o0,r:o1});
      case 'ORI'    :return op_tmpl('0110_KKKK_dddd_KKKK',{d:o0-16,K:o1});
      case 'OUT'    :return op_tmpl('1011_1AAr_rrrr_AAAA',{A:o0,r:o1});
      case 'POP'    :return op_tmpl('1001_000d_dddd_1111',{d:o0});
      case 'PUSH'   :return op_tmpl('1001_001d_dddd_1111',{d:o0});
      case 'RCALL'  :return op_tmpl('1101_kkkk_kkkk_kkkk',{k:rdist(o0,2048)});
      case 'RET'    :return op_tmpl('1001_0101_0000_1000',{});
      case 'RETI'   :return op_tmpl('1001_0101_0001_1000',{});
      case 'RJMP'   :return op_tmpl('1100_kkkk_kkkk_kkkk',{k:rdist(o0,2048)});
      case 'ROL'    :return op_encode(pc,'ADC',[o0,o0]);
      case 'ROR'    :return op_tmpl('1001_010d_dddd_0111',{d:o0});
      case 'SBC'    :return op_tmpl('0000_10rd_dddd_rrrr',{d:o0,r:o1});
      case 'SBCI'   :return op_tmpl('0100_KKKK_dddd_KKKK',{d:o0-16,K:o1});
      case 'SBI'    :return op_tmpl('1001_1010_AAAA_Abbb',{A:o0,b:o1});
      case 'SBIC'   :return op_tmpl('1001_1001_AAAA_Abbb',{A:o0,b:o1});
      case 'SBIS'   :return op_tmpl('1001_1011_AAAA_Abbb',{A:o0,b:o1});
      case 'SBIW'   :return op_tmpl('1001_0111_KKdd_KKKK',{d:(o0-24)/2,K:o1});
      case 'SBR'    :return op_encode(pc,'ORI',oo);
      case 'SBRC'   :return op_tmpl('1111_110r_rrrr_0bbb',{r:o0,b:o1});
      case 'SBRS'   :return op_tmpl('1111_111r_rrrr_0bbb',{r:o0,b:o1});
      case 'SEC'    :return op_encode(pc,'BSET',[0]);
      case 'SEH'    :return op_encode(pc,'BSET',[5]);
      case 'SEI'    :return op_encode(pc,'BSET',[7]);
      case 'SEN'    :return op_encode(pc,'BSET',[2]);
      case 'SER'    :return op_encode(pc,'LDI',[o0,0xFF]);
      case 'SES'    :return op_encode(pc,'BSET',[4]);
      case 'SET'    :return op_encode(pc,'BSET',[6]);
      case 'SEV'    :return op_encode(pc,'BSET',[3]);
      case 'SEZ'    :return op_encode(pc,'BSET',[1]);
      case 'SLEEP'  :return op_tmpl('1001_0101_1000_1000',{});
      case 'SPM'    :return op_tmpl('1001_0101_1110_1000',{});
      case 'SPM.Z+' :return op_tmpl('1001_0101_1111_1000',{});
      case 'ST.X'   :return op_tmpl('1001_001r_rrrr_1100',{r:o0});
      case 'ST.X+'  :return op_tmpl('1001_001r_rrrr_1101',{r:o0});
      case 'ST.-X'  :return op_tmpl('1001_001r_rrrr_1110',{r:o0});
      case 'ST.Y'   :return op_tmpl('1000_001r_rrrr_1000',{r:o0});
      case 'ST.Y+'  :return op_tmpl('1001_001r_rrrr_1001',{r:o0});
      case 'ST.-Y'  :return op_tmpl('1001_001r_rrrr_1010',{r:o0});
      case 'STD.Y'  :return op_tmpl('10q0_qq1r_rrrr_1qqq',{q:o0,r:o1});
      case 'ST.Z'   :return op_tmpl('1000_001r_rrrr_0000',{r:o0});
      case 'ST.Z+'  :return op_tmpl('1001_001r_rrrr_0001',{r:o0});
      case 'ST.-Z'  :return op_tmpl('1001_001r_rrrr_0010',{r:o0});
      case 'STD.Z'  :return op_tmpl('10q0_qq1r_rrrr_0qqq',{q:o0,r:o1});
      case 'STS'    :return op_tmpl('1001_001d_dddd_0000_kkkk_kkkk_kkkk_kkkk',{k:o0,d:o1});
      case 'STS.RC' :return op_tmpl('1010_1kkk_dddd_kkkk',{k:o0,d:o1-16});
      case 'SUB'    :return op_tmpl('0001_10rd_dddd_rrrr',{d:o0,r:o1});
      case 'SUBI'   :return op_tmpl('0101_KKKK_dddd_KKKK',{d:o0-16,K:com2(o1,128)});
      case 'SWAP'   :return op_tmpl('1001_010d_dddd_0010',{d:o0});
      case 'TST'    :return op_encode(pc,'AND',[o0,o0]);
      case 'WDR'    :return op_tmpl('1001_0101_1010_1000',{});
      case 'XCH.Z'  :return op_tmpl('1001_001r_rrrr_0100',{r:o0});
    }
    throw 'unknown instruction '+op;
    return ['??','??']
  }

  function eval_scoped(js,context) {
    return function() { with(this) { return eval(js); }; }.call(context);
  }

  function new_context(context){
    for (let i = 0; i < 32; i++){
      context['R'+i]=i;
    }
    context.LOW = function(x){
      return x&0xff;
    }
    context.HIGH = function(x){
      return (x>>8)&0xff;
    }
    context.X = 26;
    context.Y = 28;
    context.Z = 30;
    context.__arr__ = function(x){
      let o = [];
      // console.log(x);
      for (let i = 0; i < x.length; i++){
        if (typeof x[i] == 'number'){
          o.push(x[i])
        }else{
          for (let j = 0; j < x[i].length; j++){
            o.push(x[i].charCodeAt(j));
          }
        }
      }
      return o;
    }
    return context;
  }

  function parse(str,reader,context){

    str = str.replace(/\r/g,'\n').replace(/\\\n/g,' ').split("\n").map(x=>x.split(';')[0]).join('\n');
    str = str.replace(/\t/g,' ');
    str = str.replace(/\\"/g,'”');
    str = str.replace(/#pragma.*\n/g,"\n");
    
    let quq = str.split('"');
    for (let i = 0; i < quq.length; i++){
      quq[i] = quq[i].replace(/”/g,'"');
      if (i&1) continue;
      if (quq[i].trim() == '' && quq[i+1]){
        quq[i] = '+';
        continue;
      }
      quq[i] = quq[i].replace(/('.+?')/g,(_,x)=>eval(x).charCodeAt(0));
      quq[i] = quq[i].toUpperCase();
      
      for (let j = 0; j < keywords.length; j++){
        quq[i] = quq[i].replaceAll(' '+keywords[j]+' ','\n'+keywords[j]+' ');
      }
      quq[i] = quq[i].replace(/:/g,':\n');
    }
    str = quq.join('"');

    let lines = str.split('\n').map(x=>x.trim()).filter(x=>x.length);
    let lst = {
      __main__:[],
    };
    let cur = '__main__';
    let if_states = [];
    for (let i = 0; i < lines.length; i++){
      if (lines[i].startsWith('.EXIT')) break;

      if (lines[i].startsWith('.IFDEF')){
        let tf = context[lines[i].slice(6).trim()] !== undefined;
        if_states.unshift(tf);
      }else if (lines[i].startsWith('.IFNDEF')){
        let tf = context[lines[i].slice(7).trim()] == undefined;
        if_states.unshift(tf);
      }else if (lines[i].startsWith('.IF')){
        let tf = !!eval_scoped(lines[i].slice(3),context);
        if_states.unshift(tf);
      }else if (lines[i].startsWith('.ELIF')){
        if (!if_states[0]){
          let tf = !!eval_scoped(lines[i].slice(5),context);
          if_states[0] = tf;
        }else{
          if_states[0] = null;
        }
      }else if (lines[i].startsWith('.ELSE')){
        if (if_states[0] !== null){
          if_states[0] ^= 1;
        }
      }else if (lines[i].startsWith('.ENDIF')){
        if_states.shift();
      }
      if (if_states.length && !if_states[0]){
        continue;
      }
      if (lines[i].endsWith(":")){
        lst[cur].push(['$LABEL',lines[i].slice(0,-1)]);
      }else if (lines[i].startsWith(".INCLUDE")){
        let inc = reader(lines[i].slice(8).trim().slice(1,-1));
        let mst = parse(inc,reader,context);
        for (let k in mst){
          if (k == '__main__'){
            lst[k] = lst[k].concat(mst[k]);
          }else{
            lst[k] = mst[k];
          }
        }
      }else if (lines[i].startsWith(".EQU") || lines[i].startsWith(".DEF") || lines[i].startsWith(".SET") ){
        let [a,b] = lines[i].slice(4).split('=').map(x=>x.trim());
        context[a] = eval_scoped(b,context);
      }else if (lines[i].startsWith(".UNDEF")){
        let a = lines[i].slice(6).trim();
        delete context[a];
      }else if (lines[i].startsWith("#DEFINE")){
        let ss = lines[i].slice(8).split(" ");
        while (!ss[0].trim().length) ss.shift();
        let a = ss.shift();
        let b = ss.join(' ');
        context[a] = eval_scoped(b,context);
      }else if (lines[i].startsWith('#')){
        continue;
      }else if (lines[i].startsWith(".CSEG") || lines[i].startsWith(".DSEG") || lines[i].startsWith(".ESEG")){
        lst[cur].push(['$SEG',lines[i][1]]);
      }else if (lines[i].startsWith(".BYTE")){
        let o = eval_scoped(lines[i].slice(5),context);
        lst[cur].push(['$BYTE',o]);
      }else if (lines[i].startsWith(".DB")){
        let o = eval_scoped('new Uint8Array(__arr__(['+lines[i].slice(3)+'])).buffer',context);
        lst[cur].push(['$DB',o]);
      }else if (lines[i].startsWith(".DW")){
        let o = eval_scoped('new Uint16Array(__arr__(['+lines[i].slice(3)+'])).buffer',context);
        lst[cur].push(['$DB',o]);
      }else if (lines[i].startsWith(".DD")){
        let o = eval_scoped('new Uint32Array(__arr__(['+lines[i].slice(3)+'])).buffer',context);
        lst[cur].push(['$DB',o]);
      }else if (lines[i].startsWith(".DQ")){
        let o = eval_scoped('new BigUint64Array(__arr__(['+lines[i].slice(3)+'])).buffer',context);
        lst[cur].push(['$DB',o]);
      }else if (lines[i].startsWith(".ORG")){
        lst[cur].push(['$ORG',eval_scoped(lines[i].slice(4),context)]);
      }else if (lines[i].startsWith(".MACRO")){
        cur = lines[i].slice(6).trim();
        lst[cur] = [];
      }else if (lines[i].startsWith('.ENDM')){
        cur = '__main__';
      }else if (lines[i].startsWith(".MESSAGE") || lines[i].startsWith(".ERROR") || lines[i].startsWith(".WARNING")){
        console.log(lines[i].split(' ')[0], eval_scoped(lines[i].split(' ').slice(1).join(' '),context));
      }else if (lines[i].startsWith(".DEVICE")){
        device.name = lines[i].slice(7).trim();
      }else if (lines[i].startsWith('.')){
        continue;
      }else{
        let op = lines[i].split(' ')[0];
        let operands = lines[i].slice(op.length).split(',').map(x=>x.trim()).filter(x=>x.length);
        lst[cur].push([op,operands]);
      }
    }
    if (context.PROGMEM_SIZE){
      device.flash_bytes = context.PROGMEM_SIZE;
    }else if (context.FLASHEND){
      device.flash_bytes = context.FLASHEND*2;
    }
    if (context.SRAM_START){
      device.ram_start = context.SRAM_START;
    }
    return lst;
  }

  let sum = {};

  function compile(ins,context){
    function expand(q){
      if (q[0][0] == '$'){
        return [q];
      }
      let [op,operands] = q;
      let out = [];
      if (ins[op]){
        for (let j = 0; j < ins[op].length; j++){
          if (ins[op][j][0][0] == '$'){
            out.push(ins[op][j]);
            continue;
          }
          let [x,xx] = ins[op][j];
          for (let k = 0; k < xx.length; k++){
            for (let l = 0; l < 10; l++){
              xx[k] = xx[k].replaceAll('@'+l,operands[l]);
            }
          }
          expand([x,xx]).forEach(a=>out.push(a));
        }
      }else{
        out.push([op,operands]);
      }
      return out;
    }

    sum.C = {max:device.flash_bytes||context.PROGMEM_SIZE||-1,data:0,code:0};
    sum.D = {max:context.SRAM_SIZE||-1,data:0,code:0};
    sum.E = {max:context.EEPROM_SIZE||-1,data:0,code:0};

    let lst = [];
    for (let i = 0; i < ins.__main__.length; i++){
      expand(ins.__main__[i]).forEach(x=>lst.push(x))
    }
    // console.log(lst);

    let pc = {C:0,D:device.ram_start,E:0};
    let seg = 'C';
    let out = [];
    for (let i = 0; i < lst.length; i++){
      if (lst[i][0] == '$SEG'){
        seg = lst[i][1];
      }else if (lst[i][0] == '$LABEL'){
        if (context[lst[i][1]]){
          throw 'duplicate label: '+lst[i][1];
        }
        context[lst[i][1]] = pc[seg];
      }else if (lst[i][0] == '$BYTE'){
        if (seg == 'C'){
          throw '.BYTE not allowed in .CSEG';
        }
        pc[seg] += lst[i][1];
        sum[seg].data += lst[i][1];
      }else if (lst[i][0] == '$DB'){
        if (seg == 'C'){
          let bs = lst[i][1];
          if (bs.byteLength & 1){
            bs = Array.from(new Uint8Array(bs));
            bs.push(0);
            bs = new Uint8Array(bs).buffer;
          }
          bs = new Uint16Array(bs);
          out.push([pc[seg],'.DW',bs]);
          pc[seg] += bs.length;
          sum[seg].data += bs.byteLength;
        }else{
          pc[seg] += lst[i][1].byteLength;
          sum[seg].data += lst[i][1].byteLength;
        }
      }else if (lst[i][0] == '$ORG'){
        pc[seg] = lst[i][1];
      }else{
        if (seg == 'C'){
          out.push([pc[seg],...lst[i]]);
          let n = op_len(lst[i][0]);
          pc[seg] += n/2;
          sum[seg].code += n;
        }else{
          throw 'code in '+seg+'SEG';
        }
      }
    }

    let special = new Set([
      'X','Y','Z','X+','Y+','Z+','-X','-Y','-Z'
    ]);
    for (let i = 0; i < out.length; i++){
      let [pc,op,operands] = out[i];
      // console.log(pc,op,operands);
      if (op == '.DW') continue;
      for (let j = 0; j < operands.length; j++){
        if (!op.endsWith('W') && special.has(operands[j])){
          op += '.'+operands[j];
          operands.splice(j,1);
          j--;
        }else if (operands[j].startsWith('Y+')){
          operands[j] = operands[j].slice(2);
          op += '.Y'
        }else if (operands[j].startsWith('Z+')){
          operands[j] = operands[j].slice(2);
          op += '.Z'
        }
      }
      if (op == 'LDS' || op == 'STS'){
        if (device.instr_set.toLowerCase().endsWith('rc')){
          op += ".RC";
        }
      }
      operands = operands.map(x=>eval_scoped(x,context));
      out[i] = [pc,op,operands];
    } 

    return out;
  }

  function assemble(lst){
    let code = [];
    for (let i = 0; i < lst.length; i++){
      // console.log(lst[i])
      let [pc,op,operands] = lst[i];
      while (code.length < pc*2){
        code.push(0);
      }
      if (code.length != pc*2){
        throw "address overlap in cseg: "+pc;
      }
      if (op == '.DW'){
        let bs = Array.from(new Uint8Array(operands.buffer));
        bs.forEach(x=>code.push(x));
      }else{
        if (missing[op] && missing[op].includes(device.instr_set.slice(-1).toLowerCase())){
          throw "instruction set "+device.instr_set+" does not support "+op;
        }
        let z = op_encode(pc,op,operands);
        code.push(...z);
      }
    }
    return code;
  }
  function to_ihex(code){
    function hex(x,n){
      return x.toString(16).toUpperCase().padStart(n,'0');
    }
    let oo = [':020000020000FC'];
    for (let i = 0; i < code.length; i+=16){
      let page = code.slice(i,i+16);
      let o = `:${hex(page.length,2)}${hex(i,4)}00`;
      let s = page.length+((i>>8)&0xff)+(i&0xff);
      for (let j = 0; j < page.length; j++){
        o += hex(page[j],2);
        s += page[j];
      }
      s = ((~s)+1) & 0xff;
      o += hex(s,2);
      oo.push(o);
    }
    oo.push(':00000001FF\n')
    return oo.join('\n');
  }

  function print_summary(){
    function nf(n){
      if (n < 0){
        return '?'.padStart(6,' ');
      }
      return n.toString().padStart(6,' ');
    }
    let o = "";
    o += "__SEGM_|__CODE_|__DATA_|__USED_|__SIZE_|__USE%_";
    for (let k in sum){
      o += "\n ."+k+"SEG ";
      let s = sum[k].code+sum[k].data;
      let p = Math.round(s/sum[k].max*1000)/10;
      o += "|"+nf(sum[k].code)+" ";
      o += "|"+nf(sum[k].data)+" ";
      o += "|"+nf(s)+" ";
      o += "|"+nf(sum[k].max)+" ";
      o += "|"+nf(p).slice(1)+"% ";
    }
    return o;
  }

  that.new_context = new_context;
  that.device = device;
  that.parse = parse;
  that.compile = compile;
  that.assemble = assemble;
  that.to_ihex = to_ihex;
  that.summary = sum;
  that.print_summary = print_summary;
  that.asm_to_hex = function(str, reader){
    let context = new_context({});
    let lst = parse(str,reader,context);
    let ins = compile(lst,context);
    console.log(print_summary());
    let code = assemble(ins);
    let hex = to_ihex(code);
    return hex;
  }
}

if (typeof module != "undefined"){
  module.exports = AVRLASS;
}
