'use strict';


Module.register("MMM-Wattvision", {
    usage: [],
    hist: [],
    // Default module config.
    defaults: {
        updateInterval: 10 * 60 * 1000, // every 10 minutes
        url: 'https://www.wattvision.com/api/v0.2/elec',
        sensor_id: '', // value from wattvision
        api_id: '', // value from wattvision
        api_key: '', // value from wattvision
        width: 250,
        height: 200,
        fadeSpeed: 2000
    },

    getStyles: function() {
        return ["MMM-Wattvision.css"];
    },

    getScripts: function() {
        return ["modules/" + this.name + "/node_modules/chart.js/dist/Chart.bundle.min.js"];
    },
    
    start: function() {
        this.loaded = false;
        this.getData();
        this.scheduleUpdate();
    },

    // Override dom generator.
    getDom: function() {
        const outerWrapper = document.createElement("wattvision");
        const demandWrapper = document.createElement("div");
        const chartWrapper = document.createElement("div");
        chartWrapper.setAttribute("style", "position: relative; display: inline-block;");

        if (!this.loaded) {
            outerWrapper.innerHTML = this.translate("LOADING");
            outerWrapper.className = "dimmed light small";
            return outerWrapper;
        }

        demandWrapper.className = 'medium bright';

        if (this.usage.data && this.hist) {
            var iconElement =  document.createElement("span");
            var value = "";

            //check for valid number
            if (this.usage.data.length >= 0 && !isNaN(this.usage.data[0].v)) {
                value = this.usage.data[0].v / 1000;
            }
            
            var demand = value;

            var demandElement = document.createElement("span");
            demandElement.innerHTML = demand;

            if (demand > 2) {
                demandElement.className = "up";
                iconElement.className = "up fa fa-fw fa-exclamation-circle";
            }
            else {
                demandElement.className = "down";
            }

            var unitElement = document.createElement("span");
            unitElement.innerHTML = "kW";

            var divider = document.createElement("span");                 
            divider.innerHTML = ' ';

            demandWrapper.appendChild(iconElement);
            demandWrapper.appendChild(demandElement);
            demandWrapper.appendChild(divider);
            demandWrapper.appendChild(unitElement);
            
            // Create chart canvas
            const chartCanvas  = document.createElement("canvas");
                        
            var x = 0;
            var arrV = [];
            var arrLabels = []; //later set to blanks so the graph plots the points

            //we get datapoints every 10 seconds in a 3 hour span. We should display points at a longer interval, thus the 30
            for (i = 0; i < this.hist.data.length; i++) {
                if (i == 0 || i % 30 == 0) {
                    if (this.hist.data[i].v > 0) {
                        arrV.push(this.hist.data[i].v / 1000);
                        arrLabels.push('');
                    }
                }
            }
            
            var chartconfig = {
                type: 'line',
                data: {
                    labels: arrLabels,
                    datasets: [{
                        backgroundColor: "#3e95cd",
                        data: arrV.reverse()
                    }]
                },
                options: {
                    elements: { point: { radius: 0 } }, 
                    legend: { display: false },
                    title: { display: true, text: "Last 3hr usage", padding: 5}
                }
            };
            
            this.chart = new Chart(chartCanvas.getContext("2d"), chartconfig);
            chartCanvas.width  = this.config.width;
            chartCanvas.height = this.config.height;
            chartCanvas.setAttribute("style", "width: " + this.config.width + "; height: " + this.config.height+";");
            
            // Append chart
            chartWrapper.appendChild(chartCanvas);
        
            outerWrapper.appendChild(demandWrapper);
            outerWrapper.appendChild(chartWrapper);
        }

        return outerWrapper;
    },

    scheduleUpdate: function(delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        setInterval(function() {
            self.getData();
        }, nextLoad);
    },

    getData: function () {
        var date_start = new Date(Date.now());
        var date_end = new Date(Date.now());
        date_start.setHours(date_start.getHours() - 3);

        //get the last usage rate
        var url = this.config.url + '?sensor_id=' + this.config.sensor_id + '&api_id=' + this.config.api_id + '&api_key=' + this.config.api_key + 
            '&type=latest_rate&start_time=' + date_start.toISOString() + '&end_time=' + date_end.toISOString();

        this.sendSocketNotification('usage', url);   

        //get the entire collection of usage (api allows maximum of 3 hours)
        url = this.config.url + '?sensor_id=' + this.config.sensor_id + '&api_id=' + this.config.api_id + '&api_key=' + this.config.api_key + 
            '&type=rate&start_time=' + date_start.toISOString() + '&end_time=' + date_end.toISOString();

        this.sendSocketNotification('history', url);        
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "usage") {
            this.usage = payload;
        } else if(notification === "history") {
            this.hist = payload;
            this.loaded = true;
            this.updateDom(2000);
        }       
    },
});