const fs = require('fs');
let {device,new_context,parse,compile,assemble,to_ihex,print_summary} = require('./avrlass.js')
let {hex_to_asm} = require("./avrdass.js");

function print_help(){
  console.log(`\
avrlass - AVR Lightweight ASSembler
usage:
  avrlass [options] src.asm 
options:
  -D <macro>=<value> Define macro
  -I <dir>           Add directory to search path
  -o <file>          Write output to file, extensions: .hex/.bin/.json
  -t <arg>           Instruction Set: AVR/AVRe/AVRe+/AVRrc/AVRxm/AVRxt
  -d                 Disassemble instead of assemble
  -h                 Print this message
`)
}

let argv = Array.from(process.argv).slice(1);

for (let i = 0; i < argv.length; i++){
  if (argv[i][0] == '-' && argv[i][1] != '-' && argv[i].length > 2){
    if (argv[i][1].toLowerCase() == argv[i][1]){
      argv.push('-'+argv[i].slice(2));
    }else{
      argv.push(argv[i].slice(2));
    }
    argv[i] = argv[i].slice(0,2);
  }
}

let src = "";
let inp_pth = null;
let out_pth = 'stdout';
let inc_pths = ['./'];
let is_dis = false;

for (let i = 1; i < argv.length; i++){
  if (argv[i] == '-t'){
    device.instr_set=argv[i+1];
    i++;
  }else if (argv[i] == '-D'){
    src += '.DEF '+argv[i+1]+'\n';
    i++;
  }else if (argv[i] == '-o'){
    out_pth = argv[i+1];
    i++;
  }else if (argv[i] == '-I'){
    inc_pths.push(argv[i+1]);
    i++;
  }else if (argv[i] == '-d'){
    is_dis = true;
  }else if (argv[i] == '-h' || argv[i] == '--help'){
    print_help();
  }else if (argv[i][0] == '-'){
    console.error('[error] unknow option: '+argv[i]);
    process.exit(1);
  }else{
    inp_pth = argv[i];
  }
}
function reader(pth){
  for (let i = 0; i < inc_pths.length; i++){
    try{
      return fs.readFileSync(inc_pths[i]+'/'+pth).toString();
    }catch(e){
    }
  }
  console.error('[error] cannot find file: '+pth);
  process.exit(1);
}


if (inp_pth == null){
  print_help();
  process.exit(0);
}

try{
  src += reader(inp_pth);
  let hex = "";

  if (!is_dis){
    let context = new_context({});

    let lst = parse(src,reader,context);

    let ins = compile(lst,context);

    console.log(print_summary());

    if (out_pth.endsWith('.json')){
      fs.writeFileSync(out_pth,'[\n'+ins.map(x=>JSON.stringify(x,(k,v)=>(v[2] instanceof Uint16Array)?[v[0],v[1],Array.from(v[2])]:v)).join(',\n')+'\n]\n');
      process.exit(0);
    }

    let code = assemble(ins);

    if (out_pth.endsWith('.bin')){
      fs.writeFileSync(out_pth,Buffer.from(code));
      process.exit(0);
    }

    hex = to_ihex(code);
  }else{
    hex = hex_to_asm(src);
  }

  if (out_pth == 'stdout'){
    console.log(hex);
  }else{
    fs.writeFileSync(out_pth,hex);
  }

}catch(e){
  console.error('[error] '+e);
  process.exit(1);
}

process.exit(0);