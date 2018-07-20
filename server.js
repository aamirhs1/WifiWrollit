const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const fs = require('fs');
const randomip = require('random-ip');

var handleCORS = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

var conProps = {
    host: 'localhost',
    user: 'sysadmin',
    password: 'sp123$%',
    database: 'WrollitWifi',
    typeCast: function castField(field, useDefaultTypeCasting) {

        // We only want to cast bit fields that have a single-bit in them. If the field
        // has more than one bit, then we cannot assume it is supposed to be a Boolean.
        if ((field.type === "BIT") && (field.length === 1)) {

            var bytes = field.buffer();

            // A Buffer in Node represents a collection of 8-bit unsigned integers.
            // Therefore, our single "bit field" comes back as the bits '0000 0001',
            // which is equivalent to the number 1.
            return (bytes[0] === 1);

        }

        return (useDefaultTypeCasting());

    }
};


var mc = mysql.createConnection(conProps);
mc.connect();
// connection configurations

// connect to database


app.use(cors());

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
}));


// default route
app.get('/', function(req, res) {
    return res.send({
        error: true,
        message: 'hello'
    })
});



// Retrieve todo with id
app.post('/serveAd', function(req, res) {

    var PostedData = req.body[0];
    console.log(PostedData);
    var LocationIdentifier = PostedData.LocationIdentifier;
    var fingerprint = PostedData.fingerprint;
    var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    console.log("Location: " + LocationIdentifier);
    console.log("Fingerprint: " + fingerprint);
    console.log("IP: "+ ip);
    mc.query("SELECT * FROM `Locations` WHERE `Identifier` = ?", LocationIdentifier, function(error, results, fields) {
      var LocationID = results[0].LocationID;

      mc.query("SELECT * FROM `LocationAds` where `LocationID`=? ORDER BY rand()", LocationID , function(err1, res1, flds1) {
        if (err1) console.log(err1);
        console.log(res1);
        mc.query('INSERT INTO `AdImpressions` (`AdID`, `Fingerprint`, `LocationID`, `IPAddress`) VALUES (?,?,?,?)', [res1[0].AdID, fingerprint, results[0].LocationID, ip] , function(err2, res2, flds2) {
          if (err2) return res.json({
              error_code: 1,
              err_desc: err2,
              data: null
          });

          return res.send({
              error: false,
              data: res1,
              message: 'Campaign list.'
          });
        });
      });
    });

});

// Retrieve todo with id
app.post('/addData', function(req, res) {
  var fingerprint = req.body.fingerprint;
  var AdID = req.body.AdID;
  var Name = req.body.name;
  var Phone = req.body.phone;

  mc.query('INSERT INTO `AdRegistrations` (`AdID`, `Fingerprint`, `Name`, `Phone`) VALUES (?,?,?,?)', [AdID, fingerprint, Name, Phone] , function(err2, res2, flds2) {

    if (err2) return res.json({
        error_code: 1,
        err_desc: err2,
        data: null
    });

    return res.send({
        error: false,
        data: res1,
        message: 'Campaign list.'
    });
  });
});

// Retrieve todo with id
app.post('/skip', function(req, res) {
  var LocationIdentifier = req.body.LocationIdentifier;

  mc.query('INSERT INTO `SkipRecords` (`LocationIdentifier`) VALUES (?)', [LocationIdentifier] , function(err2, res2, flds2) {

    if (err2) return res.json({
        error_code: 1,
        err_desc: err2,
        data: null
    });

    return res.send({
        error: false,
        data: res1,
        message: 'Campaign list.'
    });
  });
});


app.get('addNewData', function(req, res)
{
  mc.query('SELECT * FROM `Locations` ORDER BY rand() LIMIT 1', function(err2, res2, flds2) {
    mc.query('SELECT * FROM `Guids` ORDER BY rand() LIMIT 1' , function(err1, res1, flds1) {
      mc.query('SELECT * FROM `LocationAds` WHERE LocationID=? ORDER BY rand() LIMIT 1', [res2[0].LocationID] , function(err3, res3, flds3) {
        var randip = randomip('0.0.0.0', 0);
        mc.query('INSERT INTO `AdImpressions` (`AdID`, `Fingerprint`, `LocationID`, `IPAddress`) VALUES(?,?,?,?)', [res3[0].AdID, res1[0].Guid, res2[0].LocationID, randip] , function(err0, res0, flds0) {

          mc.query('INSERT INTO `SkipRecords` (`LocationIdentifier`) VALUES(?)', [res3[0].LocationIdentifier] , function(err01, res01, flds01) {
            return res.send({
                error: false,
                data: res1,
                message: 'Campaign list.'
            });
          });
        });
      });
    });
  });
});


function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function mysqlTimeStampToDate(timestamp) {
    //function parses mysql datetime string and returns javascript Date object
    //input has to be in this format: 2007-06-05 15:26:02
    var regex = /^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9]) (?:([0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?$/;
    var parts = String(timestamp).replace(regex, "$1 $2 $3 $4 $5 $6").split(' ');
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}

function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}


function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4();
}

// allows "grunt dev" to create a development server with livereload
//module.exports = app;


// all other requests redirect to 404
app.all("*", function(req, res) {
    return res.status(404).send('page not found')
});

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ', err);
});


// port must be set to 8080 because incoming http requests are routed from port 80 to port 8080
app.listen(8080, function() {
    console.log('Node app is running on port 8080');
});
