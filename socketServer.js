var io = require('socket.io')(12345)
var mysql = require('mysql')
var dotenv = require('dotenv')
dotenv.config()

var cfg = require('./config.js')

//Initialize connection variables
var con = mysql.createConnection({
    host: cfg.dbHost,
    database: cfg.dbName,
    user: cfg.appLogin,
    password: cfg.appPassword
})

//Connect to database
con.connect(function (err){
    if (err) {
        console.log('Error connecting to DB')
        console.log(err)
        return
    }
    //console.log('Connection established')
})

function generateQuery(socket, artist, song) {
	var query = 'select Artist, ' +
	'SongName, ' +
	'Time as LastPlayed ' +
	'from kvf ' +
	'where Artist like (concat("%", trim(both "\'" from "' + mysql.escape(artist) + '"), "%")) ' +
	'and SongName like (concat("%", trim(both "\'" from "' + mysql.escape(song) + '"), "%")) ' +
	'order by id ' +
	'limit 100'

	console.log(query)

	con.query(query, function(err, data) {
		if(err) {
			console.log(err)
			return
		}
		else {
			//console.log(data)
			socket.emit('dataResponse', {data: data, startCount: 0})
		}
	})
}

function getMostPopularSongs(socket, start) {
	if(start < 0) {
		start = 0
	}
	var responseObject = {
		data : null,
		startCount: start
	}

	var mostPopularSongs = 'select Artist, ' +
	'SongName, ' + 
	'count(SongName) as TimesPlayed, ' +
	'max(Time) as LastPlayed ' +
	'from kvf ' +
	'where extract(year from Time) = 2016 ' +
	//'and extract(month from Time) = 9 ' +
	'group by SongName ' +
	'order by TimesPlayed desc ' +
	'limit ' + start + ', ' + 20

	//var start = Date.now()
	con.query(mostPopularSongs, function(err, data) {
		if(err) {
			console.log(err)
		}
		else {
			responseObject.data = data
			//console.log('Query took ' + (Date.now() - start) + ' ms')
			//console.log('Sending response')
			socket.emit('dataResponse', responseObject)
		}
	})
}

io.on('connection', function(socket) {
	//console.log('Client connected')
	var lastRequest = null
	socket.on('dataRequest', function(startCount) {
		if(lastRequest == null || Date.now() - lastRequest > 500) {
			//console.log('Data request received')
			//console.log('Last request ' + (Date.now() - lastRequest) + ' milliseconds ago')
			getMostPopularSongs(socket, startCount)
			lastRequest = Date.now()
		}
		else {
			//console.log('Request too recent! ' + (Date.now() - lastRequest) + ' milliseconds ago')
		}
	})

	socket.on('search', function(artist, song) {
		generateQuery(socket, artist, song)
	})
})