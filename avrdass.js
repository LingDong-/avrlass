var AVRDASS = new function(){let that = this;
  function from_ihex(str){
    let lines = str.replace(/\r/g, '\n').split('\n').map(x=>x.trim()).filter(x=>x&&x.length).map(x=>x.split(':')[1]);
    let bytes = [];
    let baddr = 0;
    for (let i = 0; i < lines.length; i++){
      let ln = lines[i];
      let typ = parseInt(ln.slice(6,8),16);
      let num = parseInt(ln.slice(0,2),16);
      let dat = [];
      for (let j = 8; j < ln.length-2; j+=2){
        dat.push(parseInt(ln.slice(j,j+2),16));
      }
      let addr = parseInt(ln.slice(2,6),16)+baddr;
      if (typ == 0){
        dat.forEach(x=>(bytes[addr++]=x));
      }else if (typ == 2){
        baddr = parseInt(ln.slice(8,12),16);
      }
    }
    bytes = bytes.map(x=>(x===undefined)?(0xff):x);
    return bytes;
  }

  function op_match(bytes,op,tmpl,fun){
    tmpl = tmpl.split('').filter(x=>(x!='_')).reverse();
    let pcd = 1;
    if (tmpl.length > 16){
      tmpl = tmpl.slice(16).concat(tmpl.slice(0,16))
      pcd ++;
    }
    let args = {};
    let argl = {};
    for (let i = 0; i < tmpl.length; i++){
      let p = ~~(i/8);
      let q = i & 7;
      let b = (bytes[p]>>q)&1;
      if (tmpl[i] == '0'){
        if (b) return false;
      }else if (tmpl[i] == '1'){
        if (!b) return false;
      }else{
        if (args[tmpl[i]] == undefined){
          args[tmpl[i]] = 0;
          argl[tmpl[i]] = 0;
        }
        args[tmpl[i]]|=(b<<argl[tmpl[i]]);
        argl[tmpl[i]]++;
      }
    }

    let oo = fun(args);
    if (op.includes(".")){
      let [a,b] = op.split(".");
      if (b != "RC"){
        op = a;
        if (op.startsWith("STD")){
          oo[0] = b + '+' + oo[0];
        }else if (op.startsWith("LDD")){
          oo[1] = b + '+' + oo[1];
        }else if (op.startsWith("S") || op.startsWith("XCH")){
          oo.unshift(b);
        }else{
          oo.push(b);
        }
      }
    }
    return [pcd,op,oo];
  }

  function label_addr(x){
    return 'L'+x.toString(16).padStart(4,'0').toUpperCase();
  }

  function disass_step(pc,bytes){
    function R(x){
      return 'R'+x
    }
    function L(x){
      return '0X'+x.toString(16).padStart(4,'0').toUpperCase();
    }
    let com2 = (x,n)=>(x>=n?(-(n*2-1-x)):(x+1))
    return op_match(bytes,'ADC'    ,'0001_11rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'ADD'    ,'0000_11rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'ADIW'   ,'1001_0110_KKdd_KKKK',({d,K})=>[R(d*2+24),K])
         ||op_match(bytes,'AND'    ,'0010_00rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'ANDI'   ,'0111_KKKK_dddd_KKKK',({d,K})=>[R(d+16),K])
         ||op_match(bytes,'ASR'    ,'1001_010d_dddd_0101',({d})=>[R(d)])
         ||op_match(bytes,'BCLR'   ,'1001_0100_1sss_1000',({s})=>[s])
         ||op_match(bytes,'BLD'    ,'1111_100d_dddd_0bbb',({d,b})=>[R(d),b])
         ||op_match(bytes,'BRBC'   ,'1111_01kk_kkkk_ksss',({s,k})=>[s,L(pc+com2(k,64))])
         ||op_match(bytes,'BRBS'   ,'1111_00kk_kkkk_ksss',({s,k})=>[s,L(pc+com2(k,64))])
         ||op_match(bytes,'BREAK'  ,'1001_0101_1001_1000',_=>[])
         ||op_match(bytes,'BSET'   ,'1001_0100_0sss_1000',({s})=>[s])
         ||op_match(bytes,'BST'    ,'1001_101d_dddd_0bbb',({d,b})=>[R(d+16),b])
         ||op_match(bytes,'CALL'   ,'1001_010k_kkkk_111k_kkkk_kkkk_kkkk_kkkk',({k})=>[L(k)])
         ||op_match(bytes,'CBI'    ,'1001_1000_AAAA_Abbb',({A,b})=>[A,b])
         ||op_match(bytes,'COM'    ,'1001_010d_dddd_0000',({d})=>[R(d)])
         ||op_match(bytes,'CP'     ,'0001_01rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'CPC'    ,'0000_01rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'CPI'    ,'0011_KKKK_dddd_KKKK',({d,K})=>[R(d+16),K])
         ||op_match(bytes,'CPSE'   ,'0001_00rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'DEC'    ,'1001_010d_dddd_1010',({d})=>[R(d)])
         ||op_match(bytes,'DES'    ,'1001_0100_KKKK_1011',({K})=>[K])
         ||op_match(bytes,'EICALL' ,'1001_0101_0001_1001',_=>[])
         ||op_match(bytes,'EIJMP'  ,'1001_0100_0001_1001',_=>[])
         ||op_match(bytes,'ELPM'   ,'1001_0101_1101_1000',_=>[])
         ||op_match(bytes,'ELPM.Z' ,'1001_000d_dddd_0110',({d})=>[R(d)])
         ||op_match(bytes,'ELPM.Z+','1001_000d_dddd_0111',({d})=>[R(d)])
         ||op_match(bytes,'EOR'    ,'0010_01rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'FMUL'   ,'0000_0011_0ddd_1rrr',({d,r})=>[R(d+16),R(r+16)])
         ||op_match(bytes,'FMULS'  ,'0000_0011_1ddd_0rrr',({d,r})=>[R(d+16),R(r+16)])
         ||op_match(bytes,'FMULSU' ,'0000_0011_1ddd_1rrr',({d,r})=>[R(d+16),R(r+16)])
         ||op_match(bytes,'ICALL'  ,'1001_0101_0000_1001',_=>[])
         ||op_match(bytes,'IJMP'   ,'1001_0100_0000_1001',_=>[])
         ||op_match(bytes,'IN'     ,'1011_0AAd_dddd_AAAA',({d,A})=>[R(d),A])
         ||op_match(bytes,'INC'    ,'1001_010d_dddd_0011',({d})=>[R(d)])
         ||op_match(bytes,'JMP'    ,'1001_010k_kkkk_110k_kkkk_kkkk_kkkk_kkkk',({k})=>[L(k)])
         ||op_match(bytes,'LAC'    ,'1001_001r_rrrr_0110',({r})=>[R(r)])
         ||op_match(bytes,'LAS'    ,'1001_001r_rrrr_0101',({r})=>[R(r)])
         ||op_match(bytes,'LAT'    ,'1001_001r_rrrr_0111',({r})=>[R(r)])
         ||op_match(bytes,'LD.X'   ,'1001_000d_dddd_1100',({d})=>[R(d)])
         ||op_match(bytes,'LD.X+'  ,'1001_000d_dddd_1101',({d})=>[R(d)])
         ||op_match(bytes,'LD.-X'  ,'1001_000d_dddd_1110',({d})=>[R(d)])
         ||op_match(bytes,'LD.Y'   ,'1000_000d_dddd_1000',({d})=>[R(d)])
         ||op_match(bytes,'LD.Y+'  ,'1001_000d_dddd_1001',({d})=>[R(d)])
         ||op_match(bytes,'LD.-Y'  ,'1001_000d_dddd_1010',({d})=>[R(d)])
         ||op_match(bytes,'LDD.Y'  ,'10q0_qq0d_dddd_1qqq',({d,q})=>[R(d),q])
         ||op_match(bytes,'LD.Z'   ,'1000_000d_dddd_0000',({d})=>[R(d)])
         ||op_match(bytes,'LD.Z+'  ,'1001_000d_dddd_0001',({d})=>[R(d)])
         ||op_match(bytes,'LD.-Z'  ,'1001_000d_dddd_0010',({d})=>[R(d)])
         ||op_match(bytes,'LDD.Z'  ,'10q0_qq0d_dddd_0qqq',({d,q})=>[R(d),q])
         ||op_match(bytes,'LDI'    ,'1110_KKKK_dddd_KKKK',({d,K})=>[R(d+16),K])
         ||op_match(bytes,'LDS'    ,'1001_000d_dddd_0000_kkkk_kkkk_kkkk_kkkk',({d,k})=>[R(d),k])
         ||op_match(bytes,'LDS.RC' ,'1010_0kkk_dddd_kkkk',({d,k})=>[R(d+16),k])
         ||op_match(bytes,'LPM'    ,'1001_0101_1100_1000',_=>[])
         ||op_match(bytes,'LPM.Z'  ,'1001_000d_dddd_0100',({d})=>[R(d)])
         ||op_match(bytes,'LPM.Z+' ,'1001_000d_dddd_0101',({d})=>[R(d)])
         ||op_match(bytes,'LSR'    ,'1001_010d_dddd_0110',({d})=>[R(d)])
         ||op_match(bytes,'MOV'    ,'0010_11rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'MOVW'   ,'0000_0001_dddd_rrrr',({d,r})=>[R(d*2),r*2])
         ||op_match(bytes,'MUL'    ,'1001_11rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'MULS'   ,'0000_0010_dddd_rrrr',({d,r})=>[R(d+16),R(r+16)])
         ||op_match(bytes,'MULSU'  ,'0000_0011_0ddd_0rrr',({d,r})=>[R(d+16),R(r+16)])
         ||op_match(bytes,'NEG'    ,'1001_010d_dddd_0001',({d})=>[R(d)])
         ||op_match(bytes,'NOP'    ,'0000_0000_0000_0000',_=>[])
         ||op_match(bytes,'OR'     ,'0010_10rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'ORI'    ,'0110_KKKK_dddd_KKKK',({d,K})=>[R(d+16),K])
         ||op_match(bytes,'OUT'    ,'1011_1AAr_rrrr_AAAA',({A,r})=>[A,R(r)])
         ||op_match(bytes,'POP'    ,'1001_000d_dddd_1111',({d})=>[R(d)])
         ||op_match(bytes,'PUSH'   ,'1001_001d_dddd_1111',({d})=>[R(d)])
         ||op_match(bytes,'RCALL'  ,'1101_kkkk_kkkk_kkkk',({k})=>[L(pc+com2(k,2048))])
         ||op_match(bytes,'RET'    ,'1001_0101_0000_1000',_=>[])
         ||op_match(bytes,'RETI'   ,'1001_0101_0001_1000',_=>[])
         ||op_match(bytes,'RJMP'   ,'1100_kkkk_kkkk_kkkk',({k})=>[L(pc+com2(k,2048))])
         ||op_match(bytes,'ROR'    ,'1001_010d_dddd_0111',({d})=>[R(d)])
         ||op_match(bytes,'SBC'    ,'0000_10rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'SBCI'   ,'0100_KKKK_dddd_KKKK',({d,K})=>[R(d+16),K])
         ||op_match(bytes,'SBI'    ,'1001_1010_AAAA_Abbb',({A,b})=>[A,b])
         ||op_match(bytes,'SBIC'   ,'1001_1001_AAAA_Abbb',({A,b})=>[A,b])
         ||op_match(bytes,'SBIS'   ,'1001_1011_AAAA_Abbb',({A,b})=>[A,b])
         ||op_match(bytes,'SBIW'   ,'1001_0111_KKdd_KKKK',({d,K})=>[R(d*2+24),K])
         ||op_match(bytes,'SBRC'   ,'1111_110r_rrrr_0bbb',({r,b})=>[R(r),b])
         ||op_match(bytes,'SBRS'   ,'1111_111r_rrrr_0bbb',({r,b})=>[R(r),b])
         ||op_match(bytes,'SLEEP'  ,'1001_0101_1000_1000',_=>[])
         ||op_match(bytes,'SPM'    ,'1001_0101_1110_1000',_=>[])
         ||op_match(bytes,'SPM.Z+' ,'1001_0101_1111_1000',_=>[])
         ||op_match(bytes,'ST.X'   ,'1001_001r_rrrr_1100',({r})=>[R(r)])
         ||op_match(bytes,'ST.X+'  ,'1001_001r_rrrr_1101',({r})=>[R(r)])
         ||op_match(bytes,'ST.-X'  ,'1001_001r_rrrr_1110',({r})=>[R(r)])
         ||op_match(bytes,'ST.Y'   ,'1000_001r_rrrr_1000',({r})=>[R(r)])
         ||op_match(bytes,'ST.Y+'  ,'1001_001r_rrrr_1001',({r})=>[R(r)])
         ||op_match(bytes,'ST.-Y'  ,'1001_001r_rrrr_1010',({r})=>[R(r)])
         ||op_match(bytes,'STD.Y'  ,'10q0_qq1r_rrrr_1qqq',({q,r})=>[q,R(r)])
         ||op_match(bytes,'ST.Z'   ,'1000_001r_rrrr_0000',({r})=>[R(r)])
         ||op_match(bytes,'ST.Z+'  ,'1001_001r_rrrr_0001',({r})=>[R(r)])
         ||op_match(bytes,'ST.-Z'  ,'1001_001r_rrrr_0010',({r})=>[R(r)])
         ||op_match(bytes,'STD.Z'  ,'10q0_qq1r_rrrr_0qqq',({q,r})=>[q,R(r)])
         ||op_match(bytes,'STS'    ,'1001_001d_dddd_0000_kkkk_kkkk_kkkk_kkkk',({k,d})=>[k,R(d)])
         ||op_match(bytes,'STS.RC' ,'1010_1kkk_dddd_kkkk',({k,d})=>[k,R(d+16)])
         ||op_match(bytes,'SUB'    ,'0001_10rd_dddd_rrrr',({d,r})=>[R(d),R(r)])
         ||op_match(bytes,'SUBI'   ,'0101_KKKK_dddd_KKKK',({d,K})=>[R(d+16),K])
         ||op_match(bytes,'SWAP'   ,'1001_010d_dddd_0010',({d})=>[R(d)])
         ||op_match(bytes,'WDR'    ,'1001_0101_1010_1000',_=>[])
         ||op_match(bytes,'XCH.Z'  ,'1001_001r_rrrr_0100',({r})=>[R(r)])
  }

  function disass(bytes){
    let pc = 0;
    let ret = [];
    while (bytes.length){
      let o = disass_step(pc,bytes);
      if (o){
        let [pcd,op,oo] = o;
        ret.push(label_addr(pc)+":\t"+op+"\t"+oo.join(",\t"));
        for (let i = 0; i < pcd; i++){
          bytes.shift();
          bytes.shift();
          pc++;
        }
      }else{
        ret.push(label_addr(pc)+":\t.DB\t"+bytes.shift()+",\t"+bytes.shift());
        pc++;
      }
    }
    return ret.join("\n")
  }
  that.from_ihex = from_ihex;
  that.disass = disass;
  that.hex_to_asm = function(str){
    return disass(from_ihex(str));
  }
}

if (typeof module != "undefined"){
  module.exports = AVRDASS;
}
