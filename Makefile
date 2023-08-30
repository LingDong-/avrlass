release:
	mkdir -p dist
	pkg avrlass.cli.js -t node10-mac-x64 -o dist/avrlass-mac-x64
	pkg avrlass.cli.js -t node10-win-x64 -o dist/avrlass-win-x64.exe
	pkg avrlass.cli.js -t node10-linux-x64 -o dist/avrlass-linux-x64
download_inc:
	mkdir -p tmp;
	curl $(URL) > tmp/dfp.zip;
	cd tmp && unzip -q dfp.zip
	mkdir -p inc
	mv tmp/avrasm/inc/* inc
	rm -rf tmp
download_attiny:
	make download_inc URL=https://packs.download.microchip.com/Microchip.ATtiny_DFP.3.0.151.atpack
download_atmega:
	make download_inc URL=https://packs.download.microchip.com/Microchip.ATmega_DFP.3.1.264.atpack
download_avrdx:
	make download_inc URL=https://packs.download.microchip.com/Microchip.AVR-Dx_DFP.2.3.272.atpack
