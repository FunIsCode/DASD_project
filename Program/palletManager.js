
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var replaceall = require('replaceall');
var http = require('http');
var events = require('events');

var eventEmitter = new events.EventEmitter();
app = express();

var hostname = 'localhost';
var port = 5555;
var pallets = [];

var id = "";
var frame = "";
var f_colour = "";
var screen = "";
var s_colour = "";
var keyboard = "";
var k_colour = "";

app.use(bodyParser.text({type: 'text/json'}));

app.post('/notifs',function(req,res){ //Handle an order from UserInt

    var msg = req.body;
    //console.log(msg);

    parsed_input = msg.toString().split(",");

    frame = parsed_input[0];
    f_colour = parsed_input[1];
    screen = parsed_input[2];
    s_colour = parsed_input[3];
    keyboard = parsed_input[4];
    k_colour = parsed_input[5];
    //console.log(frame+" "+f_colour+" "+screen+" "+s_colour+" "+keyboard+" "+k_colour);
    //console.log(res);

    //addOrderToPallet(frame, f_colour, screen, s_colour, keyboard, k_colour);

    request({
        url: 'http://localhost:6007',
        method: "POST",
        body: '{id:"LoadNew",senderID:"palletManager",lastEmit:0,payload:{}}',
        headers:{'Content-Type':'json'}
    },function (err, res, body) {console.log(body)});

})

app.post('/findDest',function(req, res){ //Response to destination query from WS1 or 7
    //console.log(req.body);
    var PID = replaceall('"',"",req.body);
    //console.log(PID);
    var dest = "";

    for(i=0;i<pallets.length;i++){

        if(pallets[i]._id == PID){
            dest = pallets[i].destination;
            console.log(pallets[i].destination);

            break;
        } else if (i == pallets.length-1){
            dest = "moon";
            break;
        }
    }
    //console.log(dest);
    res.setHeader('Content-Type', 'text/json');
    res.json({Des : dest.toString()});
    res.end();

});

app.post('/findPaper',function(req, res){ //Response paper state of a pallet for WS1
    //console.log(req.body);
    var PID = replaceall('"',"",req.body);
    //console.log(PID);
    var paper = "";
    var Pport = 0;

    for(i=0;i<pallets.length;i++){

        if(pallets[i]._id == PID){
            paper = pallets[i].hasPaper;
            Pport = pallets[i]._port;
            console.log(pallets[i]._port.toString());
            break;
        } else if (i == pallets.length-1){
            dest = "moon";
            break;
        }
    }
    //console.log(paper.toString());
    res.setHeader('Content-Type', 'text/json');
    res.send('{"Paper" :'+'"'+paper.toString()+'"'+",Port :"+Pport.toString()+"}");
    res.end();

})

app.post('/newID', function(req,res){ //Handle creation of a new pallet agent
    //console.log(req.body);
    var PID = replaceall('"',"",req.body);
    //console.log(PID);

    if (pallets.length > 1){
        for(i=0;i<pallets.length;i++){ //Use this if ID reused

            if(pallets[i]._id == PID){
                pallets[i].destination = 1;
                pallets[i]._frame = frame;
                pallets[i]._f_colour = f_colour;
                pallets[i]._screen = screen;
                pallets[i]._s_colour = s_colour;
                pallets[i]._keyboard = keyboard;
                pallets[i]._k_colour = k_colour;

                break;
            } else if (pallets[i]._id != PID && i == pallets.length-1)
               //console.log("ANNA 8000")
                pallets.push(new Pallet(req.body,frame,f_colour,screen,s_colour,keyboard,k_colour, 8000+2*pallets.length));
                pallets[pallets.length-1].runServer();
                break;
            }

    } else {
        pallets.push(new Pallet(req.body, frame, f_colour, screen, s_colour, keyboard, k_colour, port+1+pallets.length));
        pallets[pallets.length - 1].runServer();
    }

})

app.listen(port,hostname,function(){
    console.log(`palletManager listening at http://${hostname}:${port}/`);
});

var Pallet = function(id,fr,fr_c,scr,scr_c,kb,kb_c, pt){
    this._id = id;
    this.hardness = 0;
    this.hasPaper = false;
    this.destination = 1;
    this._frame = fr;
    this._f_colour = fr_c;
    this._screen = scr;
    this._s_colour = scr_c;
    this._keyboard = kb;
    this._k_colour = kb_c;
    this._port = pt;
}

Pallet.prototype.runServer = function () {

    var ref = this;

    setInterval(function() {
        console.log("Port: "+ref._port+". Paper: "+ref.hasPaper+". Dest: "+ref.destination);
    },5000);

    var myServer = http.createServer(function(req, res) {
        var method = req.method;
        console.log("Method: " + method);

        if (method == 'POST'){
            var body = [];
            req.on('data', function(chunk) {
                body.push(chunk);
                console.log("Body???: " + body.toString());

                parsed_input = body.toString().split(",");
                parsed_id = parsed_input[0].split(":");
                console.log(parsed_id[1]);

                if (parsed_id[1] == '"PaperLoaded"'){ //First determine hardness level and then start negotiation for frame
                    ref.hasPaper = true;
                    var k = 0;

                    if (ref._f_colour == ref._s_colour && ref._k_colour == ref._f_colour){
                        k = 12;
                        ref.hardness = 1;
                    } else if (ref._f_colour == ref._s_colour || ref._k_colour == ref._s_colour){
                        k = 9;
                        ref.hardness = 2;
                    } else{
                        k = 5;
                        ref.hardness = 3;
                    }

                    var x = 2;
                    var gotNoColour = false;

                    var processOrdering = function(i) { //Good way synchronous loop used

                        if (i == 7) {
                            i = 8;
                        }

                        if (i < k + 1) {
                            if (gotNoColour == false) {//First round of negotation with hihg expectations
                                portToSent = 6000 + i;
                                //console.log(portToSent.toString());

                                request({
                                    url: 'http://localhost:' + portToSent,
                                    method: "POST",
                                    body: '{id:"Colour",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                    headers: {'Content-Type': 'json'}
                                }, function (req, res, err) {
                                    console.log(portToSent.toString());
                                    console.log(res.body);

                                    var parsed_res = res.body.split(":");
                                    var colour = replaceall("}", "", parsed_res[1]);
                                    console.log(colour);

                                    if (colour == ref._f_colour) {
                                        console.log("Colour Match");
                                        request({
                                            url: 'http://localhost:' + portToSent,
                                            method: "POST",
                                            body: '{id:"HasOrder",senderID:"' + ref._id + '",lastEmit:0,payload:{}}',
                                            headers: {'Content-Type': 'json'}
                                        }, function (req, res, err) {
                                            console.log(portToSent.toString());
                                            console.log(res.body);
                                            var parsed_res = res.body.split(":");
                                            var occupied = replaceall("}", "", parsed_res[1]);
                                            //console.log(occupied);

                                            if (occupied == 'false') {
                                                console.log("FREE");
                                                request({
                                                    url: 'http://localhost:' + portToSent,
                                                    method: "POST",
                                                    body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._frame + '}}',
                                                    headers: {'Content-Type': 'json'}
                                                }, function (req, res, err) {

                                                    if (res.body == "OK") {
                                                        console.log("Order IN");
                                                        ref.destination = i;
                                                        ref.ordered = true;
                                                        eventEmitter.removeListener('new_iteration',listner);

                                                        request({
                                                            url: 'http://localhost:' + 6001,
                                                            method: "POST",
                                                            body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                            headers: {'Content-Type': 'json'}
                                                        }, function (req, res, err) {});
                                                    }
                                                    else {
                                                        console.log("ALREADY OCCUPIED");
                                                        eventEmitter.emit('new_iteration');
                                                    }

                                                });
                                            } else {
                                                console.log("RIGHT COLOUR BUT ALREADY SOLD HIMSELF");
                                                eventEmitter.emit('new_iteration');
                                            }
                                        });
                                    } else {
                                        console.log("ERIVARIT");
                                        eventEmitter.emit('new_iteration');
                                    }

                                });
                            } else if (gotNoColour == true) { //2nd round of negotiataion with lowered expectations
                                portToSent = 6000 + i;
                                //console.log(portToSent.toString());

                                request({
                                    url: 'http://localhost:' + portToSent,
                                    method: "POST",
                                    body: '{id:"HasOrder",senderID:"' + ref._id + '",lastEmit:0,payload:{}}',
                                    headers: {'Content-Type': 'json'}
                                }, function (req, res, err) {
                                    console.log(portToSent.toString());
                                    console.log(res.body);
                                    var parsed_res = res.body.split(":");
                                    var occupied = replaceall("}", "", parsed_res[1]);
                                    console.log(occupied);

                                    if (occupied == 'false') {
                                        console.log("FREE");
                                        request({
                                            url: 'http://localhost:' + portToSent,
                                            method: "POST",
                                            body: '{id:"ChangeColour",senderID:' + ref._id + ',lastEmit:0,payload:{Colour:' + ref._f_colour + '}',
                                            headers: {'Content-Type': 'json'}
                                        }, function (req, res, err) {
                                            if (res.body == "OK") {
                                                console.log("Colour changed");
                                                request({
                                                    url: 'http://localhost:' + portToSent,
                                                    method: "POST",
                                                    body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._frame + '}}',
                                                    headers: {'Content-Type': 'json'}
                                                }, function (req, res, err) {

                                                    if (res.body == "OK") {
                                                        console.log("Order IN");
                                                        ref.destination = i;
                                                       // ref.ordered = true;
                                                        eventEmitter.removeListener('new_iteration',listner);

                                                        setTimeout(function(){
                                                            request({
                                                                url: 'http://localhost:' + 6001,
                                                                method: "POST",
                                                                body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                                headers: {'Content-Type': 'json'}
                                                            }, function (req, res, err) {});
                                                        },1000);

                                                    } else {
                                                        console.log("ALREADY OCCUPIED");
                                                        eventEmitter.emit('new_iteration1');
                                                    }


                                                })
                                            } else {
                                                console.log("ALREADY OCCUPIED");
                                                eventEmitter.emit('new_iteration');
                                            }
                                        });

                                    } else {
                                        console.log("ALREADY HAD ORDER");
                                        eventEmitter.emit('new_iteration');
                                    }
                                })
                            }

                            var listner = function listner() {
                                if (i == k) {
                                    gotNoColour = true;
                                    eventEmitter.emit('gotNoColour');
                                    i = 1;
                                }
                                    processOrdering(i + 1);

                            }

                            eventEmitter.once('new_iteration', listner);
                        }
                    }
                    processOrdering(x);

                } else if (parsed_id[1] == '"PaperUnLoaded"'){
                    ref.hasPaper = false;
                    ref.destination = 7;

                } else if (parsed_id[1] == '"Framed"'){ //First check rightly framed and then start negotiation for screen
                    console.log(req.body);

                    parsed_PID = parsed_input[3].split(":");
                    made_PID = parsed_PID[2];

                    parsed_frame = parsed_input[4].split(":");
                    made_frame = replaceall('"',"",parsed_frame[1]);

                    parsed_colour = parsed_input[5].split(":");
                    made_colour = replaceall("}","",parsed_colour[1]);
                    made_colour = replaceall('"',"",made_colour);

                    console.log(made_PID+made_frame+made_colour);

                    //ref.ordered = false;
                    //ref.framed = true;

                    if(ref._f_colour != made_colour || ref._id != made_PID || ref._frame != made_frame){
                        console.log("WRONG KIND OF FRAME MADE. ABORTING PRODUCTION!");
                        ref.destination = 1;

                    } else {
                        console.log("Validly framed "+ref._id);

                        if(ref._s_colour == ref._f_colour){ //Stay at same WS if there is no need to change color

                            portToSent = 6000+ref.destination;

                            request({
                                url: 'http://localhost:' + portToSent,
                                method: "POST",
                                body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._screen + '}}',
                                headers: {'Content-Type': 'json'}
                            }, function (req, res, err) {
                                console.log(portToSent.toString());
                                if (res.body == "OK") {
                                    console.log("Order IN");
                                    //ref.ordered = true;
                                } else {
                                    console.log("SOMETHING WRONG WITH PALLET. ABORTING PRODUCTION!")
                                    ref.destination = 1;

                                    request({
                                        url: 'http://localhost:' + oldPort,
                                        method: "POST",
                                        body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                        headers: {'Content-Type': 'json'}
                                    }, function (req, res, err) {});
                                }
                                }
                            )

                        } else {
                            var k = 0;
                            if(ref.hardness == 2){
                                 k = 12;
                            } else if(ref.hardness == 3){
                                 k = 9;
                            } else {
                                console.log("PALLET HAS NO HARDNESS FACTOR. ABORTING PRODUCTION!");
                                ref.destination = 1;

                                request({
                                    url: 'http://localhost:' + oldPort,
                                    method: "POST",
                                    body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                    headers: {'Content-Type': 'json'}
                                }, function (req, res, err) {});
                            }

                            var x = ref.destination+1;

                            var gotNoColour2 = false;

                            var processOrdering2 = function(i) { //Synchronous loop in good way

                                if (i == 7) {
                                    i = 8;
                                }

                                if (i < k + 1) {
                                    if (gotNoColour2 == false) { // First round of neg
                                        portToSent = 6000 + i;
                                        //console.log(portToSent.toString());

                                        request({
                                            url: 'http://localhost:' + portToSent,
                                            method: "POST",
                                            body: '{id:"Colour",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                            headers: {'Content-Type': 'json'}
                                        }, function (req, res, err) {
                                            console.log(portToSent.toString());
                                            console.log(res.body);

                                            var parsed_res = res.body.split(":");
                                            var colour = replaceall("}", "", parsed_res[1]);
                                            console.log(colour);

                                            if (colour == ref._s_colour) {
                                                console.log("Color MATCH");
                                                request({
                                                    url: 'http://localhost:' + portToSent,
                                                    method: "POST",
                                                    body: '{id:"HasOrder",senderID:"' + ref._id + '",lastEmit:0,payload:{}}',
                                                    headers: {'Content-Type': 'json'}
                                                }, function (req, res, err) {
                                                    console.log(res.body);
                                                    var parsed_res = res.body.split(":");
                                                    var occupied = replaceall("}", "", parsed_res[1]);
                                                    console.log(occupied);

                                                    if (occupied == 'false') {
                                                        console.log("FREE");
                                                        request({
                                                            url: 'http://localhost:' + portToSent,
                                                            method: "POST",
                                                            body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._screen + '}}',
                                                            headers: {'Content-Type': 'json'}
                                                        }, function (req, res, err) {

                                                            if (res.body == "OK") {
                                                                var oldPort = 6000+ref.destination;
                                                                console.log("Order IN");
                                                                ref.destination = i;
                                                                //ref.ordered = true;
                                                                eventEmitter.removeListener('new_iteration2',listner2);

                                                                request({
                                                                    url: 'http://localhost:' + oldPort,
                                                                    method: "POST",
                                                                    body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                                    headers: {'Content-Type': 'json'}
                                                                }, function (req, res, err) {});
                                                            } else {
                                                                console.log("ALREADY OCCUPIED");
                                                                eventEmitter.emit('new_iteration2');
                                                            }

                                                        });
                                                    } else {
                                                        console.log("RIGHT COLOUR BUT ALREADY SOLD HIMSELF");
                                                        eventEmitter.emit('new_iteration2');
                                                    }
                                                });
                                            } else {
                                                console.log("No COLOUR MATCH");
                                                eventEmitter.emit('new_iteration2');
                                            }

                                        });
                                    } else if (gotNoColour2 == true) { // Second round of neg
                                        portToSent = 6000 + i;
                                        //console.log(portToSent.toString());

                                        request({
                                            url: 'http://localhost:' + portToSent,
                                            method: "POST",
                                            body: '{id:"HasOrder",senderID:"' + ref._id + '",lastEmit:0,payload:{}}',
                                            headers: {'Content-Type': 'json'}
                                        }, function (req, res, err) {
                                            console.log(portToSent.toString());
                                            console.log(res.body);
                                            var parsed_res = res.body.split(":");
                                            var occupied = replaceall("}", "", parsed_res[1]);
                                            console.log(occupied);

                                            if (occupied == 'false') {
                                                console.log("FREE");
                                                request({
                                                    url: 'http://localhost:' + portToSent,
                                                    method: "POST",
                                                    body: '{id:"ChangeColour",senderID:' + ref._id + ',lastEmit:0,payload:{Colour:' + ref._s_colour + '}',
                                                    headers: {'Content-Type': 'json'}
                                                }, function (req, res, err) {
                                                    if (res.body == "OK") {
                                                        console.log(portToSent.toString());
                                                        console.log("Colour changed");
                                                        request({
                                                            url: 'http://localhost:' + portToSent,
                                                            method: "POST",
                                                            body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._screen + '}}',
                                                            headers: {'Content-Type': 'json'}
                                                        }, function (req, res, err) {

                                                            if (res.body == "OK") {
                                                                var oldPort = 6000+ref.destination;
                                                                console.log("Order IN");
                                                                ref.destination = i;
                                                                // ref.ordered = true;
                                                                eventEmitter.removeListener('new_iteration2',listner2);

                                                                request({
                                                                    url: 'http://localhost:' + oldPort,
                                                                    method: "POST",
                                                                    body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                                    headers: {'Content-Type': 'json'}
                                                                }, function (req, res, err) {});
                                                            } else {
                                                                console.log("ALREADY OCCUPIED");
                                                                eventEmitter.emit('new_iteration2');
                                                            }


                                                        })
                                                    } else {
                                                        console.log("ALREADY OCCUPIED");
                                                        eventEmitter.emit('new_iteration2');
                                                    }
                                                });

                                            } else {
                                                console.log("ALREADY HAD ORDER");
                                                eventEmitter.emit('new_iteration2');
                                            }
                                        })
                                    }

                                    var listner2 = function listner2() {
                                        if (i == k) {
                                            gotNoColour2 = true;
                                            eventEmitter.emit('gotNoColour2');
                                            i = ref.destination;
                                        }
                                        processOrdering2(i + 1);

                                    }

                                    eventEmitter.once('new_iteration2', listner2);
                                }
                            }
                            processOrdering2(x);

                        }
                    }
                } else if (parsed_id[1] == '"Screened"'){//Checks first that validly screened then start negs for keys

                    console.log(req.body);

                    parsed_PID = parsed_input[3].split(":");
                    made_PID = parsed_PID[2];

                    parsed_screen = parsed_input[4].split(":");
                    made_screen = replaceall('"',"",parsed_screen[1]);

                    parsed_colour = parsed_input[5].split(":");
                    made_colour = replaceall("}","",parsed_colour[1]);
                    made_colour = replaceall('"',"",made_colour);

                    console.log(made_PID+made_frame+made_colour);
                    var msg = '';
                    //ref.ordered = false;
                    //ref.framed = true;

                    if(ref._s_colour != made_colour || ref._id != made_PID || ref._screen != made_screen){
                        var oldPort = 6000+ref.destination;
                        console.log("WRONG KIND OF SCREEN MADE. ABORTING PRODUCTION!");
                        ref.destination = 1;
                        request({
                            url: 'http://localhost:' + oldPort,
                            method: "POST",
                            body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                            headers: {'Content-Type': 'json'}
                        }, function (req, res, err) {});

                    } else {

                        console.log("Validly screened "+ref._id);

                        if(ref._k_colour == ref._s_colour){ //Stay at WS if no need to change color

                            res.setHeader('Content-Type', 'text/json');
                            res.end('STAY');

                            portToSent = 6000+ref.destination;

                            request({
                                    url: 'http://localhost:' + portToSent,
                                    method: "POST",
                                    body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._keyboard + '}}',
                                    headers: {'Content-Type': 'json'}
                                }, function (req, res, err) {

                                    if (res.body == "OK") {
                                        console.log("Order IN");
                                        //ref.ordered = true;
                                    } else {
                                        console.log("SOMETHING WRONG WITH PALLET. ABORTING PRODUCTION!")
                                        ref.destination = 1;
                                    }
                                }
                            )

                        } else {

                            if (ref.destination == 12){ //Stay at WS12 if already there so no new cycle in line
                                request({
                                    url: 'http://localhost:' + portToSent,
                                    method: "POST",
                                    body: '{id:"ChangeColour",senderID:' + ref._id + ',lastEmit:0,payload:{Colour:' + ref._k_colour + '}',
                                    headers: {'Content-Type': 'json'}
                                }, function (req, res, err) {
                                    console.log(res.body);

                                    if(res.body == 'OK'){

                                        request({
                                                url: 'http://localhost:6012',
                                                method: "POST",
                                                body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._keyboard + '}}',
                                                headers: {'Content-Type': 'json'}
                                            }, function (req, res, err) {

                                                if (res.body == "OK") {
                                                    console.log("Order IN");
                                                    //ref.ordered = true;
                                                } else {
                                                    var oldPort = 6000+ref.destination;
                                                    console.log("SOMETHING WRONG WITH PALLET. ABORTING PRODUCTION!")
                                                    ref.destination = 1;

                                                    request({
                                                        url: 'http://localhost:' + oldPort,
                                                        method: "POST",
                                                        body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                        headers: {'Content-Type': 'json'}
                                                    }, function (req, res, err) {});
                                                }
                                            }
                                        )
                                    }
                                })
                            } else {
                                var k = 12;
                                var x = ref.destination+1;
                                console.log("screening for keyboards starting...");
                                var gotNoColour3 = false;

                                var processOrdering3 = function(i) { //Synchronous loop not blocking way
                                    console.log("screening for keyboards starting again...");
                                    if (i == 7) {
                                        i = 8;
                                    }

                                    //console.log (i.toString()+" "+k.toString());
                                    if (i < k + 1) {
                                        if (gotNoColour3 == false) { //First round of negs
                                            var portToSent = 6000 + i;
                                            //console.log(portToSent.toString());

                                            request({
                                                url: 'http://localhost:' + portToSent,
                                                method: "POST",
                                                body: '{id:"Colour",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                headers: {'Content-Type': 'json'}
                                            }, function (req, res, err) {

                                                console.log(res.body);

                                                var parsed_res = res.body.split(":");
                                                var colour = replaceall("}", "", parsed_res[1]);
                                                console.log(colour);

                                                if (colour == ref._k_colour) {
                                                    //console.log("PUNKKU ON PUNKKUA");
                                                    request({
                                                        url: 'http://localhost:' + portToSent,
                                                        method: "POST",
                                                        body: '{id:"HasOrder",senderID:"' + ref._id + '",lastEmit:0,payload:{}}',
                                                        headers: {'Content-Type': 'json'}
                                                    }, function (req, res, err) {
                                                        console.log(res.body);
                                                        var parsed_res = res.body.split(":");
                                                        var occupied = replaceall("}", "", parsed_res[1]);
                                                        console.log(occupied);

                                                        if (occupied == 'false') {
                                                            console.log("FREE");
                                                            request({
                                                                url: 'http://localhost:' + portToSent,
                                                                method: "POST",
                                                                body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._keyboard + '}}',
                                                                headers: {'Content-Type': 'json'}
                                                            }, function (req, res, err) {

                                                                if (res.body == "OK") {
                                                                    oldPort = 6000+ref.destination;
                                                                    console.log("Order IN");
                                                                    ref.destination = i;
                                                                    //ref.ordered = true;
                                                                    eventEmitter.removeListener('new_iteration3',listner3);

                                                                    request({
                                                                        url: 'http://localhost:' + oldPort,
                                                                        method: "POST",
                                                                        body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                                        headers: {'Content-Type': 'json'}
                                                                    }, function (req, res, err) {});
                                                                }

                                                            });
                                                        } else {
                                                            console.log("RIGHT COLOUR BUT ALREADY SOLD HIMSELF");
                                                            eventEmitter.emit('new_iteration3');
                                                        }
                                                    });
                                                } else {
                                                    console.log("No COLOUR MATCH");
                                                    eventEmitter.emit('new_iteration3');
                                                }

                                            });
                                        } else if (gotNoColour3 == true) { //No 2bd round of negs. Pallet will finish in same WS
                                            portToSent = 6000+ref.destination;

                                            request({
                                                url: 'http://localhost:' + portToSent,
                                                method: "POST",
                                                body: '{id:"ChangeColour",senderID:' + ref._id + ',lastEmit:0,payload:{Colour:' + ref._k_colour + '}',
                                                headers: {'Content-Type': 'json'}
                                            }, function (req, res, err) {
                                               //console.log(res.body);

                                                if(res.body == 'OK'){
                                                    portToSent = 6000+ref.destination;
                                                    request({
                                                            url: 'http://localhost:' + portToSent,
                                                            method: "POST",
                                                            body: '{id:"Order",senderID:' + ref._id + ',lastEmit:0,payload:{Port:' + ref._port + ',Order:' + ref._keyboard + '}}',
                                                            headers: {'Content-Type': 'json'}
                                                        }, function (req, res, err) {
                                                            console.log(res.body);
                                                            if (res.body == 'OK') {
                                                                //console.log("Order IN");
                                                                //ref.ordered = true;
                                                            } else {
                                                                console.log("SOMETHING WRONG WITH PALLET. ABORTING PRODUCTION!")
                                                                ref.destination = 1;
                                                                request({
                                                                    url: 'http://localhost:' + portToSent,
                                                                    method: "POST",
                                                                    body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                                    headers: {'Content-Type': 'json'}
                                                                }, function (req, res, err) {});
                                                            }
                                                        }
                                                    )
                                                } else {
                                                    console.log("Colour Change Failed! Aborting Production");

                                                    var portToSent = 6000+ref.destination;
                                                    console.log("Validly keyboarded "+ref._id);
                                                    ref.destination = 1;
                                                    setTimeout(function(){
                                                        request({
                                                            url: 'http://localhost:' + portToSent,
                                                            method: "POST",
                                                            body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                                                            headers: {'Content-Type': 'json'}
                                                        }, function (req, res, err) {})},1000);
                                                }
                                            })
                                        }

                                        var listner3 = function listner3() {
                                            if (i == k) {
                                                gotNoColour3 = true;
                                                eventEmitter.emit('gotNoColour3');
                                                i=ref.destination;
                                            }/* else if (gotNoColour3 == true){
                                                gotNoColour3 = false;
                                                i=ref.destination;
                                            }*/
                                            processOrdering3(i + 1);

                                        }

                                        eventEmitter.once('new_iteration3', listner3);
                                    }
                                }
                                processOrdering3(x);


                            }
                        }
                    }

                } else if (parsed_id[1] == '"Keyboarded"'){ //Validate keyboard and then head to WS1

                    console.log(req.body);

                    parsed_PID = parsed_input[3].split(":");
                    made_PID = parsed_PID[2];

                    parsed_keyboard = parsed_input[4].split(":");
                    made_keys = replaceall('"',"",parsed_keyboard[1]);

                    parsed_colour = parsed_input[5].split(":");
                    made_colour = replaceall("}","",parsed_colour[1]);
                    made_colour = replaceall('"',"",made_colour);

                    console.log(made_PID+made_frame+made_colour);
                    var msg = '';
                    //ref.ordered = false;
                    //ref.framed = true;

                    if(ref._k_colour != made_colour || ref._id != made_PID || ref._keyboard != made_keys){
                        var oldPort = 6000+ref.destination;
                        console.log("WRONG KIND OF KEYBOARD MADE. ABORTING PRODUCTION!");
                        ref.destination = 1;

                        request({
                            url: 'http://localhost:' + oldPort,
                            method: "POST",
                            body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                            headers: {'Content-Type': 'json'}
                        }, function (req, res, err) {});
                    } else {

                        var portToSent = 6000+ref.destination;
                        console.log("Validly keyboarded "+ref._id);
                        ref.destination = 1;
                        setTimeout(function(){
                        request({
                            url: 'http://localhost:' + portToSent,
                            method: "POST",
                            body: '{id:"ForceMove",senderID:"' + ref._id.toString() + '",lastEmit:0,payload:{}}',
                            headers: {'Content-Type': 'json'}
                        }, function (req, res, err) {})},1000);
                    }

                } else {
                    console.log("Unknown command ID");
                }
            })
        }
    })

    myServer.listen(ref._port, "127.0.0.1", () => {
        console.log('Pallet Agent server for pallet ' + ref._id + ' is running at http://127.0.0.1:' + ref._port);
})
}

