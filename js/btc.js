function Btc(value, radix) {
    this.radix = radix ? radix : '.';
    value = value === undefined ? 0 : value;
    var s = value.toString();
    var d = s.indexOf(this.radix);    
    
    this.integer = d == -1 ? s : s.slice(0, d);
    this.fractional =  s.slice(d + 1) + "00000000".slice(s.length - d - 1);
    
    this.integer = parseInt(this.integer, 10);
    this.fractional = parseInt(this.fractional, 10);
    
    this.precision = 100000000;
}
    
Btc.prototype.toString = function () {
    return this.integer + this.radix + "00000000".slice(this.fractional.toString().length) + this.fractional;
}

Btc.prototype.add = function (btc) {
    var fractional = this.fractional + btc.fractional;
    var integer = this.integer + btc.integer;
    
    if(fractional >= this.precision){        
        integer += parseInt(fractional / this.precision);
        fractional = fractional % this.precision;
    }    
    var r = new Btc();
    r.fractional = fractional;
    r.integer = integer;
    return r;
}
    