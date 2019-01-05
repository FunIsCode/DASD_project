

var express = require('express')
var request = require('request');
var fs = require('fs');
var bodyParser = require('body-parser');
var replaceall = require("replaceall")

app = express();

var hostname = 'localhost';
var port = 4444;

var information = "";
var result = "";
var htmlBody;

fs.readFile('index.html',function (err, data){         // read html page

    if (err) {
        throw err;
    }
    htmlBody = data;        // html page
});

app.use(bodyParser.text({type: 'text/json'}));

app.get('/',function(req,res){
    responseWeb(res);
})

app.post('/',function(req,res){
    var body = []; //Getting data:
    req.on('data', function(chunk) {
        //Parse the request
        body.push(chunk);
        var inp = body.toString();
        var querless = replaceall("query=","",inp);
        var parsed_input = querless.split("&");

        var frame = parsed_input[0];
        var f_colour = parsed_input[1].toUpperCase();
        var screen = parsed_input[2];
        var s_colour = parsed_input[3].toUpperCase();
        var keyboard = parsed_input[4];
        var k_colour = parsed_input[5].toUpperCase();
        //console.log(frame+" "+f_colour+" "+screen+" "+s_colour+" "+keyboard+" "+k_colour);

        if (!(frame == '1' || frame == '2' || frame == '3')){
            console.log("Invalid Order");
            information ="Error: "
            result = "Wrong kind of frame. Valid values are '1', '2' and '3'";
            responseWeb(res);
            return;
        } else if(!(f_colour == 'RED' || f_colour == 'GREEN' || f_colour == 'BLUE')){
            console.log("Invalid Order");
            information ="Error: "
            result = "Wrong kind of frame colour. Valid values are 'red', 'green' and 'blue'";
            responseWeb(res);
            return;
        } else if(!(screen == '4' || screen == '5' || screen == '6')){
            console.log("Invalid Order");
            information ="Error:"
            result = "Wrong kind of screen. Valid values are '4', '5' and '6'";
            responseWeb(res);
            return;
        } else if(!(s_colour == 'RED' || s_colour == 'GREEN' || s_colour == 'BLUE')){
            console.log("Invalid Order");
            information ="Error: "
            result = "Wrong kind of screen colour. Valid values are 'red', 'green' and 'blue'";
            responseWeb(res);
            return;
        } else if(!(keyboard == '7' || keyboard == '8' || keyboard == '9')){
            console.log("Invalid Order");
            information ="Error: "
            result = "Wrong kind of keyboard. Valid values are '7', '8' and '9'";
            responseWeb(res);
            return;
        } else if(!(k_colour == 'RED' || k_colour == 'GREEN' || k_colour == 'BLUE')){
            console.log("Invalid Order");
            information ="Error: "
            result = "Wrong kind of keyboard colour. Valid values are 'red', 'green' and 'blue'";
            responseWeb(res);
            return;
        }

        information ="Valid Order!"
        result = "Make an other one";
        responseWeb(res)
        console.log("Valid order");

        var order = frame+","+f_colour+","+screen+","+s_colour+","+keyboard+","+k_colour

        //console.log(order);

        request({
            url: 'http://localhost:5555/notifs',
            method: "POST",
            body: order,
            headers:{'Content-Type':'text/json'}
        },function (err, res, body) {console.log(body)});

    })
})

app.listen(port,hostname,function(){
    console.log(`UI listening at http://${hostname}:${port}/`);
});

function responseWeb(res) {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(htmlBody);
    res.write('<br>');
    res.write('<h2>'+information+'</h2>'+'<br>' + result);  //PLOT query results
    res.end();
}