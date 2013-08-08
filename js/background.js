var pollIntervalMin = 1000 * 60 * 2; 
var pollIntervalMax = 1000 * 60 * 10;  
var chartsInterval = 1000 * 60 * 15;
var requestFailureCount = 0;  // used for exponential backoff
var requestTimeout = 1000 * 60;
var options = {};
var data = {}; // current data
var prices = [];
var ts; // timestamp
var scheduled = false;
var summary = {};
var count;
var empty = {
    hashrate: 0,
    workers_all: 0,
    workers_alive: 0,            
    confirmed_reward: new Btc(),
    unconfirmed_reward: new Btc(),
    estimated_reward: new Btc(),
    count: 0,
    payout: new Btc()
};
var defaults = {        
    summary: true,
    badge: 'hashrate',
    convert: true
};

var pool = {
    title: "",
    url: "",
    token_url: "settings",
    token_selector: "",
    token_getter: function(element){
        return element.text();
    },
    token_process: function(text){
        return text;
    },
    summaryfields: ["hashrate", "workers_formatted", "confirmed_reward", "unconfirmed_reward", "estimated_reward", "payout"],
    fields: [],
    init: function(){
        this.fields = this.summaryfields.concat(this.fields);
    },
    preprocess: function(){
        for(var field in this.fieldsMap){
            this.data[field] = this.data[this.fieldsMap[field]];
        }
    },
    process: function(){},
    postprocess: function(){
        this.data = this.data ? this.data : {};
        for(var key in empty){
            if(this.data[key] == undefined){
                this.data[key] = empty[key];
            }
        }
        
        this.data.hashrate = parseInt(this.data.hashrate, 10);            
        if(this.data.workers_all){
            this.data.workers_formatted = this.data.workers_alive + '/' + this.data.workers_all;    
        }
                 
        ["confirmed_reward", "unconfirmed_reward", "estimated_reward", "payout"].forEach(function(i){
            this.data[i] = new Btc(this.data[i]);              
        }, this);
       
        calculateSummary();
    }
}

function calculateSummary(){
    summary = Object.create(empty);
    for(var p in pools){
        if(options[p].token && pools[p].data != undefined){
            summary.workers_all += pools[p].data.workers_all;
            summary.workers_alive += pools[p].data.workers_alive;
            summary.workers_formatted = summary.workers_alive + '/' + summary.workers_all;
            summary.hashrate += pools[p].data.hashrate;  
            ["confirmed_reward", "unconfirmed_reward", "estimated_reward", "payout"].forEach(function(i){
                summary[i] = summary[i].add(pools[p].data[i]);                
            }, this);
        }
    }    
      
    var text = '';            
    if(options.badge == 'hashrate'){
        // 12      => 12
        // 1234    => 1234
        // 123.    => 123
        // 12345   => 12K
        // 123456  => 123K
        // 1234567 => 1.2M
                
        if(summary.hashrate >= 1000000){
            text = (summary.hashrate / 1000000).toString().slice(0, 3).replace(/\.$/, '') + 'M';
        } else if(summary.hashrate >= 10000){
            text = parseInt(summary.hashrate / 1000).toString() + 'K';
        } else {
            text = summary.hashrate.toString().slice(0, 4).replace(/\.$/, '');
        }                    
    } else if(options.badge == 'confirmed_reward'){
        // remove dot from the end - this format supports up to 9999 BTC                    
        text = summary[options.badge].toString().slice(0, 4).replace(/\.$/, '');
    } else {
        text = summary[options.badge].toString().slice(0, 4);
    }              
            
    chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 255, 0, 255]
    });
            
    chrome.browserAction.setBadgeText({
        text: text
    }); 
    var popup = chrome.extension.getViews({
        type: 'popup'
    });
    if(popup.length){
        popup[0].location.reload();
    }
    updatePopup();
}

function updatePopup(){
    var popup = chrome.extension.getViews({
        type: 'popup'
    });
    if(popup.length){
        popup[0].draw();
    }
}

var pools = {};
pools.deepbit = {
    title: "deepbit.net",
    url: "https://deepbit.net/",
    api: "api/",
    account_url: "account",     
    token_url: "settings",                  
    token_selector: "#middle>div>b",
    fieldsMap: {
        payout: "payout_history"
    },
    process: function(){                
        this.data.workers_alive = 0;
        this.data.workers_all = 0;                
        for(var i in this.data.workers) {                   
            this.data.workers_all++;
            if(this.data.workers[i].alive){
                this.data.workers_alive ++;
            }                   
        }              
    }
};
pools.slush = {
    title: "mining.bitcoin.cz",
    url: "http://mining.bitcoin.cz/",
    api: "accounts/profile/json/",
    account_url: "accounts/profile",
    token_url: "accounts/token-manage",
    token_selector: "#token",
    token_getter: function(element){
        return element.val();
    },
    fields: [],
    process: function(){
        this.data.payout = 0;
        this.data.workers_alive = 0;
        this.data.workers_all = 0;
        this.data.hashrate = 0;                
        for (var i in this.data.workers) {                    
            this.data.workers_all++;
            this.data.hashrate += this.data.workers[i].hashrate;
            
            if(this.data.workers[i].alive){
                this.data.workers_alive ++;
            }                
        }
    }
};
pools.btcguild = {
    title: "btcguild.com",
    url: "https://www.btcguild.com/",
    api: "api.php?api_key=",
    account_url: "my_account.php",
    token_url: "my_api.php",
    token_selector: "#content .middle b",
    fields: ["payouts"],
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        unconfirmed_reward: "unconfirmed_rewards",
        estimated_reward: "estimated_rewards",
        payout: "payouts"
    },
    preprocess: function(){
        for(var field in this.fieldsMap){
            this.data.user[field] = this.data.user[this.fieldsMap[field]];
        }
    },
    process: function(){             
        var result = this.data.user;
        result.hashrate = 0;
        result.workers_alive = 0;
        result.workers_all = 0;
        for (var i in this.data.workers) {                    
            result.workers_all++;
            result.hashrate += this.data.workers[i].hash_rate;
            
            // 5 minutes delay                    
            if(this.data.workers[i].last_share != 'never' &&
                (new Date("1,1,1970 " + this.data.workers[i].last_share).getTime()
                - new Date("1,1,1970").getTime()) / 1000 < 5 * 60){
                result.workers_alive++;
            }                   
        }
        this.data = result;
    }
};
pools.btcmine = {
    title: "btcmine.com",
    url: "https://btcmine.com/",
    api: "api/getstats/",
    account_url: "user/profile",
    token_url: "user/profile",
    token_selector: "#id_auth_token",
    token_getter: function(element){
        return element.val();
    },
    fields: ["total_bounty", "solved_blocks", "round_shares", "solved_shares", "total_payout"],
    fieldsMap: {
        confirmed_reward: "confirmed_bounty",
        unconfirmed_reward: "unconfirmed_bounty",
        estimated_reward: "estimated_bounty",
        payout: "total_payout"
    },
    process: function(){
        var xhr = new XMLHttpRequest(); 
        var that = this;
        this.data.workers_all = 0;
        this.data.workers_alive = 0;
        try {
            xhr.onreadystatechange = function(){
                if (xhr.readyState != 4){
                    return;
                }
        
                if (xhr.status == 200 && xhr.responseText != ""){
                    var miners = JSON.parse(xhr.responseText); 
                    that.data.workers_all = miners.miners.length;                           
                    for(var i = 0; i < miners.miners.length; i++){
                        if(miners.miners[i].online_status){
                            that.data.workers_alive++    
                        }                                
                    }
                    that.data.workers_formatted = that.data.workers_alive + '/' + that.data.workers_all;    
                    calculateSummary();
                }
            }
    
            xhr.onerror = function(error) {
        
            }
            
            xhr.open("GET", this.url + "api/getminerstats/" + options.btcmine.token, true);
            xhr.send(null);
        } catch(e) {
    
        }
    }
};
pools.bitclockers = {
    title: "bitclockers.com",
    url: "https://bitclockers.com/",
    api: "api/",
    account_url: "dashboard",
    token_url: "dashboard",
    token_selector: "h3:eq(4) a",
    token_getter: function(element){
        return element.attr('href') ? element.attr('href').slice(-32) : '';
    },
    fieldsMap: {                
        confirmed_reward: "balance",
        estimated_reward: "estimatedearnings",
    },
    process: function(){
        this.data.workers_alive = 0;
        this.data.workers_all = 0;                
        for (var i in this.data.workers) {                   
            this.data.workers_all++;
            if(this.data.workers[i].active){
                this.data.workers_alive ++;
            }  
        }              
    }
};
pools.polmine = {
    title: "polmine.pl",
    url: "https://polmine.pl/",
    api: "api/",
    account_url: "dashboard",
    token_url: "dashboard",
    token_selector: "h3 a",
    token_getter: function(element){                
        return element.attr('href') ? element.attr('href').slice(-32) : '';
    },
    fieldsMap: {
        confirmed_reward: "balance"              
    },
    process: function(){
        this.data.workers_all = 0;                
        this.data.workers_alive = 0;
        for (var i in this.data.workers) {
            this.data.workers_all++;
            if(parseInt(this.data.workers[i].hashrate)){
                this.data.workers_alive ++;
            }
        }               
    }
};
pools.simplecoin = {
    title: "simplecoin.us",
    url: "http://simplecoin.us/",
    api: "api.php?api_key=",
    account_url: "accountdetails.php",
    token_url: "accountdetails.php",
    token_selector: "table:eq(0) tr:eq(2) td:eq(1)",
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        estimated_reward: "estimated_rewards",                
        payout: "payout_history"
    },
    token_getter: function(element){                
        return element[1] != undefined ? element[1].textContent : '';
    },
    process: function(){
        this.data.workers_alive = 0;
        this.data.workers_all = 0;                
        for (var i in this.data.workers) {                   
            this.data.workers_all++;                    
            if(this.data.workers[i].alive != 0){                        
                this.data.workers_alive ++;
            }
        }
        this.data.unconfirmed_reward = 0;               
    }
};
pools.ozcoin = {
    title: "ozco.in",
    url: "https://ozco.in/",
    api: "api.php?api_key=",
    account_url: "accountdetails.php",
    token_url: "accountdetails.php",
    token_selector: ".accounts_table tr:eq(1) td:eq(1)",
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        estimated_reward: "estimated_rewards",                
        payout: "payout_history"
    },
    token_getter: function(element){                
        return element[0] != undefined ? element[0].textContent : '';
    },
    process: function(){
        this.data.workers_alive = 0;
        this.data.workers_all = 0;                
        for (var i in this.data.workers) {                   
            this.data.workers_all++;                    
            if(this.data.workers[i].alive != 0){                        
                this.data.workers_alive ++;
            }
        }
        this.data.unconfirmed_reward = 0;               
    }
};
pools.mtred = {
    title: "mtred.com",
    url: "https://mtred.com/",
    api: "api/user/key/",
    account_url: "user/profile.html",
    token_url: "user/profile.html",
    token_selector: "table.dataGrid tr:eq(6) td",
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        payout: "payout_history"
    },            
    process: function(){
        this.data.workers_alive = 0;
        this.data.workers_all = 0;
        for (var i in this.data.workers) {
            this.data.workers_all++;                    
            if(this.data.workers[i].mhash > 0){                        
                this.data.workers_alive ++;
            }
        }
        this.data.unconfirmed_reward = 0;
        this.data.estimated_reward = 0;
    }
};
pools.arsbitcoin = {
    title: "arsbitcoin.com",
    url: "https://arsbitcoin.com/",
    api: "api.php?api_key=",
    account_url: "accountdetails.php",
    token_url: "accountdetails.php",
    token_selector: "#api_key",
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        payout: "payout_history",
        workers_formatted: "workers"
    },
    process: function(){
        this.data.workers_alive = 0;
        this.data.workers_all = 0;
        for (var i in this.data.workers) {
            this.data.workers_all++;
            if(this.data.workers[i].mhash > 0){
                this.data.workers_alive ++;
            }
        }
        this.data.unconfirmed_reward = 0;
        this.data.estimated_reward = 0;
    }
};

pools.bitminter = {
    title: "bitminter.com",
    url: "https://bitminter.com/",
    api: "api/users?key=",
    account_url: "members/",
    token_url: "members/apikeys",
    token_selector: "#apikeylist tr td:eq(3)",
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        hashrate: "hash_rate",
        payout: "payout_history"
    },
    process: function(){
        this.data.workers_alive = 0;
        this.data.workers_all = this.data.workers.length;
        
        for (var i = 0; i < this.data.workers.length; i++) {
            if(this.data.workers[i].alive){
                this.data.workers_alive++;
            }
        }
        this.data.unconfirmed_reward = 0;
        this.data.estimated_reward = 0;
        this.data.confirmed_reward = this.data.balances.BTC;
    }
};

pools['50btc'] = {
    title: "50btc.com",
    url: "https://50btc.com/",
    api: "en/api/",
    account_url: "account/",
    token_url: "en/account/api",
    token_selector: ".i-input",
    token_getter: function(element){
        return element.val();
    },
    fieldsMap: {
        confirmed_reward: "confirmed_rewards",
        hashrate: "hash_rate",
        payout: "payouts",
        workers_alive: "active_workers"
    },
    preprocess: function(){
        var workers_all = Object.keys(this.data.workers).length;
        this.data = this.data.user;
        this.data.workers_all = workers_all;
        
        for(var field in this.fieldsMap){
            this.data[field] = this.data[this.fieldsMap[field]];
        }
    }
};

// little inheritance
for(var p in pools){
    for(field in pool){
        if(pools[p][field] == undefined){
            pools[p][field] = pool[field];
        }
    }
    pools[p].init();
}    


function timeToSeconds(){

}

function updateOptions(){
    try {
        options = JSON.parse(localStorage.options);
    }catch(e){
    }    
    count = 0;
    for(var pool in pools){
        defaults[pool] = {
            token: ''
        };
        if(options[pool] && options[pool].token){
            count++;
        }
    }
    if(count > 1){            
        defaults.summary = true;
    }else {
        defaults.summary = false;
    }
    
    for(var key in defaults){
        if(options[key] == undefined){
            options[key] = defaults[key];
        }
    }      
}    

function scheduleRequest() {
    if(!scheduled){
        scheduled = true;
        var randomness = Math.random() * 2;
        var exponent = Math.pow(2, requestFailureCount);
        var delay = Math.min(randomness * pollIntervalMin * exponent, 
        pollIntervalMax);
        delay = Math.round(delay);

        window.setTimeout(startRequest, delay); 
    }       
}

function startRequest() {       
    ts = new Date();
    
    for(var pool in pools){
        if(options[pool].token){
            getData(pool,
            function(count) {            
                scheduleRequest();
            },
            function() {            
                scheduleRequest();
            });
        } else {
            delete data[pool];
        }
    }
    scheduled = false;
}

function getData(pool, onSuccess, onError) {        
    data[pool] = {
        status: 'Loading...'
    }
    var xhr = new XMLHttpRequest(); 
    var abortTimerId = window.setTimeout(function() {
        pools[pool].postprocess();  
        data[pool] = {
            status: 'Timeout'
        }            
        xhr.abort();  // synchronously calls onreadystatechange
    }, requestTimeout);
    
    function handleError() {
        ++requestFailureCount;
        window.clearTimeout(abortTimerId);
        chrome.browserAction.setBadgeText({
            text: "!"
        });
        pools[pool].postprocess();  

        data[pool] = {
            status: 'Error'
        }
        
        chrome.browserAction.setBadgeBackgroundColor({
            color: [255, 0, 0, 255]
        });
        if (onError){                 
            onError();       
        }      
    }
    
    function handleSuccess(pool, result) {
        requestFailureCount = 0;
        
        window.clearTimeout(abortTimerId);
        
        pools[pool].data = result;
        pools[pool].preprocess();
        pools[pool].process();
        pools[pool].postprocess();            
        data[pool] = pools[pool].data;
        
        if (onSuccess){
            onSuccess();
        }
    }
    
    try {
        xhr.onreadystatechange = function(){
            if (xhr.readyState != 4){
                return;
            }
            if(xhr.status != 200){
                handleError();
                return;
            }
            if(xhr.responseText != ""){
                handleSuccess(pool, JSON.parse(xhr.responseText));    
            }                
        }

        xhr.onerror = function(error) {
            //                handleError();
        }
        
        xhr.open("GET", pools[pool].url + pools[pool].api + options[pool].token, true);
        xhr.send(null);
    } catch(e) {
        handleError();
    }
}


function getMarkets(){

    var xhr = new XMLHttpRequest(); 
    var abortTimerId = window.setTimeout(function() {
        xhr.abort();  // synchronously calls onreadystatechange
    }, requestTimeout);       
   
    function handleError(){
        window.clearTimeout(abortTimerId);
        window.setTimeout(getMarkets, chartsInterval); 
    }
    
    function handleSuccess(data){
        window.clearTimeout(abortTimerId);
        window.setTimeout(getMarkets, chartsInterval); 
        prices = data;
    }
    
    try {
        xhr.onreadystatechange = function(){
            if (xhr.readyState != 4){
                return;
            }
            if(xhr.status != 200){
                handleError();
                return;
            }
            if(xhr.responseText != ""){
                handleSuccess(JSON.parse(xhr.responseText));    
            }                
        }

        xhr.onerror = function(error) {
            handleError();
        }
        
        xhr.open("GET", "http://bitcoincharts.com/t/weighted_prices.json", true);
        xhr.send(null);
    } catch(e) {
        handleError();
    }
}

updateOptions();
startRequest();

if(options.convert){       
    getMarkets();
}

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-23642091-1']);
_gaq.push(['_trackPageview']);
        
(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();