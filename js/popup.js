var background =  chrome.extension.getBackgroundPage();
var pools = background.pools; 
var data = background.data; 
var fields = background.pool.summaryfields;
var ts = background.ts;

function draw(){
    if(background.count){
        var html = [];                
        var rows = [];
        for(var i = 0; i < fields.length; i++){
            rows.push(chrome.i18n.getMessage(fields[i]));                                                        
        }
        html.push('<table><thead><th>pool</th><th>' + rows.join('</th><th>')  + '</th></thead><tbody>');                
    
        for(var p in data){                    
            if(data[p].status){ 
                html.push('<tr><td><a href="' + pools[p].url + pools[p].account_url + '" target="_blank">' + pools[p].title + '</a></td><td>' + data[p].status + '</td></tr>');  
            }else {
                var rows = [];
                for(var i = 0; i < fields.length; i++){
                    var value = data[p][pools[p].fields[i]] == undefined ? '-' : data[p][pools[p].fields[i]];
                    rows.push(value);                                                        
                }
                html.push('<tr><td><a href="' + pools[p].url + pools[p].account_url + '" target="_blank">' + pools[p].title + '</a></td><td>' + rows.join('</td><td>') + '</td></tr>');                                       
            }
        }  
    
        var summary = chrome.extension.getBackgroundPage().summary;
        var rows = [];                   
        for(var i = 0; i < fields.length; i++){
            rows.push(summary[fields[i]]);
        }
        html.push('<tr id="summary"><td>' + chrome.i18n.getMessage('summary') + '</td><td>' + rows.join('</td><td>') + '</td></tr>');
        
        if(background.options.convert){
            console.log(background.prices);
            var o = [];                    
            for(var i in background.prices){
                o.push('<option value="' + i +'">' + i + '</option>');
            }                      
            html.push('<tr id="convert_row"><td><select id="convert">' + o.join('') + '</select></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>');
        }      
    
        document.getElementById('pools').innerHTML = html.join('') + '</tbody></table>';                   
        document.getElementById('ts').textContent = ts.getHours() + ':' + (ts.getMinutes() < 10 ? '0' : '') + ts.getMinutes();
    } else {
        document.getElementById('pools').innerHTML = '<p>You have not set any tokens yet, please go to <a href="options.html" target="_blank">options page</a></p>';
    }
    
    if(background.options.convert){
        var change = function(){
            var value = document.getElementById('convert').value;                        
            localStorage['convert_symbol'] = value;
            var summary = document.getElementById('summary').getElementsByTagName('td');
            var convert = document.getElementById('convert_row').getElementsByTagName('td');
            
            [3, 4, 5, 6].forEach(function(i){
                var price = background.prices[value]['24h'] === undefined ? 
                    (background.prices[value]['7d'] === undefined ? 
                    background.prices[value]['30d'] :
                    background.prices[value]['7d']) : 
                    background.prices[value]['24h'];
                convert[i].textContent = (price * parseFloat(summary[i].textContent)).toFixed(2)
            });
        };
        document.getElementById('convert').addEventListener('change', change);
        document.querySelector('#convert option[value=' + (localStorage['convert_symbol'] === undefined ? 'USD' : localStorage['convert_symbol'])  + ']').selected = 'selected';
        change();
    }
}

window.onload = draw;

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-23642091-1']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();