```
  ________     ______  ______  ______  ____    ______  ______  ______ 
 /      o/|   /      \/   /  \/      \/    \  /      \/      \/      \
/_______/ |  /   /   /   /   /   /   /     / /   /   /    ---/    ---/
|_______|/  /       /\      /      _/     /_/       /---    /---    / 
'U-U-U-U'   \__/___/  \____/\__/___/\______/\__/___/\______/\______/  
 Y Y Y Y 
```

*AVRLASS - an AVR Lightweight ASSembler (and disassembler)*

AVRLASS is a minimalistic assembler and dissasembler for [AVR](https://en.wikipedia.org/wiki/AVR_microcontrollers) microcontrollers. It is written in plain JavaScript, and runs on Windows, Mac, Linux and the browser. It is both a command-line utility and a JavaScript library.

[**Here**](https://avr-asm-ide.glitch.me/) you can try AVRLASS in the browser. This online IDE also features [SerialUPDI](https://serupdi.glitch.me/) functionality, so you can write a program and upload it to your board all on a webpage, client-side.

AVRLASS does not have hardcoded device information (e.g. flash/RAM size) for all the AVR's out there, but it will try to read the information from the `.inc` file you include. You can specify the instruction set (AVRe+/AVRrc/AVRxt...) of your device, so it will warn you if an instruction is not available. Individual devices sometimes have additional missing instructions in addition to those of its family's, and for these, you'll need to read your datasheet.

AVRLASS is most tested on old and new ATtiny microcontrollers, especially on the new tinyAVR 0- and 1- families, but should work for all AVR's as long as the appropriate include files are provided.

## Usage

### Command-line

The command-line executable is `avrlass.cli.js`, you can run it with `node avrlass.cli.js`, or, make a bash alias for it, or, [download a pre-compiled binary](https://github.com/LingDong-/avrlass/releases) if you don't even have node.js.


```
$ avrlass --help
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
```

If assembly is successful, you'll see a summary of memory usage for your chip, e.g.:

```
__SEGM_|__CODE_|__DATA_|__USED_|__SIZE_|__USE%_
 .CSEG |    34 |     0 |    34 |  4096 |  0.8% 
 .DSEG |     0 |     0 |     0 |   256 |    0% 
 .ESEG |     0 |     0 |     0 |   128 |    0% 
```


### Library

Simple usage:

```js
// assembly
const {asm_to_hex} = require('./avrlass.js');
// disassembly
const {hex_to_asm} = require("./avrdass.js");

let hex = asm_to_hex(`
ser r16
sts 0x401,r16
sts 0x404,r16
`);

console.log(hex);

console.log(hex_to_asm(hex));
```

Advanced usage:

```js
const {
  device,new_context,parse,compile,assemble,to_ihex,print_summary
} = require('./avrlass.js');

device.instr_set='AVRxt';

let context = new_context({});

let lst = parse(`
ser r16
sts 0x401,r16
sts 0x404,r16
`,pth=>fs.readFileSync(pth).toString(),context);

let ins = compile(lst,context);
console.log(print_summary());
let code = assemble(ins);
let hex = to_ihex(code);
console.log(hex);


//disassembly
const {disass, from_ihex} = require("./avrdass.js")
let bytes = from_ihex(hex);
let out = disass(bytes);
console.log(out);
```

### Downloading include files

Include files are not included in this repository. You can download them from Microchip's website: https://packs.download.microchip.com

These so-called "DFP packs" are in fact zip archives. Once extracted, the `.inc` files can usually be found in `avrasm/inc` folder.

The Makefile includes some scripts to automatically download and snatch the `.inc` files for some common AVR families. e.g.:

```
make download_attiny
make download_atmega
make download_avrdx
```

## Notes

- Most assembly directives are supported, `.if`, `.else` etc.
- Most C preprocessor directives are *not* supported, `#if`, `#else` etc, except for those appearing in official `.inc` files. Use assembly counterparts instead, or, perhaps, run it through a C preprocessor first.

## References & Links

- Instruction set manual https://ww1.microchip.com/downloads/en/devicedoc/atmel-0856-avr-instruction-set-manual.pdf
- AVRASM2 manual https://ww1.microchip.com/downloads/en/DeviceDoc/40001917A.pdf
  
Some other AVR assemblers include:

- AVRASM2 -- Atmel/Microchip's official assembler that comes with their IDE https://microchipdeveloper.com/swtools:avr-asm
- avr-as -- Assembler that comes with AVR-GCC https://gcc.gnu.org/wiki/avr-gcc
- AVRA https://github.com/Ro5bert/avra
- GAVRASM http://www.avr-asm-tutorial.net/gavrasm/index_en.html
  
