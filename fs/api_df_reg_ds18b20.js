/* global OneWire, Timer */

load('api_arduino_onewire.js');
load('api_timer.js');

let RegisterDS18B20 = {
	create: function (pin) {

		let register = {
			pin: pin,

			rom: "01234567",
			maxDev: 0.1,

			readTemp: function () {

				let DATA = {
					TEMP_LSB: 0,
					TEMP_MSB: 1,
					REG_CONF: 4,
					SCRATCHPAD_SIZE: 9
				};
				let REG_CONF = {
					RESOLUTION_9BIT: 0x00,
					RESOLUTION_10BIT: 0x20,
					RESOLUTION_11BIT: 0x40,
					RESOLUTION_MASK: 0x60
				};
				let CMD = {
					CONVERT_T: 0x44,
					READ_SCRATCHPAD: 0xBE
				};
				if (this.ow.reset() === 0)
					return NaN;
				this.ow.select(this.rom);
				this.ow.write(CMD.CONVERT_T);
				this.ow.delay(750);
				this.ow.reset();
				this.ow.select(this.rom);
				this.ow.write(CMD.READ_SCRATCHPAD);
				let data = [];
				for (let i = 0; i < DATA.SCRATCHPAD_SIZE; i++) {
					data[i] = this.ow.read();
				}

				let raw = (data[DATA.TEMP_MSB] << 8) | data[DATA.TEMP_LSB];
				let cfg = (data[DATA.REG_CONF] & REG_CONF.RESOLUTION_MASK);
				if (cfg === REG_CONF.RESOLUTION_9BIT) {
					raw = raw & ~7;
				} else if (cfg === REG_CONF.RESOLUTION_10BIT) {
					raw = raw & ~3;
				} else if (cfg === REG_CONF.RESOLUTION_11BIT) {
					raw = raw & ~1;
				} // Default resolution is 12 bit

				return raw / 16.0;
			},

			tick: function () {

				if (!this.found) {
					this.ow = OneWire.create(this.pin);
					this.ow.target_search(0x28);
					this.found = this.ow.search(this.rom, 0) === 1;
				}

				if (this.found) {

					let v = this.readTemp();

					if (v > -1000 && v < 1000) {
						this.value = v;
					} else {
						this.value = undefined;
					}

					//print(this.lastSent, this.value);
					if (
							(this.lastSent === undefined && this.value !== undefined) ||
							(this.lastSent !== undefined && this.value === undefined) ||
							(	
								this.lastSent !== undefined && 
								this.value !== undefined &&
								(this.value > this.lastSent + this.maxDev || this.value < this.lastSent - this.maxDev)
							)
							) {
						this.get();
						this.lastSent = this.value;
					}

				} 

			},

			get: function () {
				print("DS18B20", this.value);
				this.observer.callback(this.value);
			}
		};

		Timer.set(2000, true, function (register) {			
			register.tick();
		}, register);


		return register;
	}
};

