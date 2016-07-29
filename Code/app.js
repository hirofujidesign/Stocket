var express = require('express');
var exphbs = require('express-handlebars');
var bodyParser = require('body-parser');
var request = require('request');
var mongoose = require('mongoose');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var historic = require('historic');
var moment = require('moment');
var favicon = require('serve-favicon');

var app = express();

// create a schema
var Schema = mongoose.Schema;

var userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password_hash: { type: String, required: true }
});

// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('User', userSchema);

// make this available to our users in our Node applications
module.exports = User;

app.use(favicon(__dirname + '/public/assets/images/favicon.ico'));

app.use(express.static(process.cwd() + '/public'));

app.use(bodyParser.urlencoded({
    extended: false
}));

app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// Routes
app.get('/', function(req, res) {
    console.log("/ route called");
    res.render('home');
});

app.get('/search/:symbol', function(req, res, next) {
    request('http://d.yimg.com/aq/autoc?query=' + req.params.symbol + '&region=US&lang=en-US', (error, response, body) => {
        if (!error && response.statusCode == 200) {
            var parsedBody = JSON.parse(body)

            var filter = {
                "suggestions": []
            }

            if (parsedBody.ResultSet.Result[0]) {
                var one = {
                    "value": parsedBody.ResultSet.Result[0].name,
                    "data": parsedBody.ResultSet.Result[0].symbol
                }
                filter.suggestions.push(one);
            }
            if (parsedBody.ResultSet.Result[1]) {
                var two = {
                    "value": parsedBody.ResultSet.Result[1].name,
                    "data": parsedBody.ResultSet.Result[1].symbol
                }
                filter.suggestions.push(two);
            }
            if (parsedBody.ResultSet.Result[2]) {
                var three = {
                    "value": parsedBody.ResultSet.Result[2].name,
                    "data": parsedBody.ResultSet.Result[2].symbol
                }
                filter.suggestions.push(three);
            }
            // console.log("filter");
            // console.log(filter);


            res.send(filter);
        }
    });
});

app.post('/:page', function(req, res) {
    var page = (req.params.page - 1);
    var searchTerm = req.body.searchTerm;
    var hint = req.body.hint
    var begin = req.body.beginDate;
    var end = req.body.endDate;
    var beginDate = begin.replace(/-/g, "");
    var endDate = end.replace(/-/g, "");

    //grab closest related name from what user types
    request('http://d.yimg.com/aq/autoc?query=' + searchTerm + '&region=US&lang=en-US', (error, response, body) => {
        if (!error && response.statusCode == 200) {
            var parsedBody = JSON.parse(body)
            // console.log("parsedBody.ResultSet");
            // console.log(parsedBody.ResultSet.Result);
            // console.log("");
            var hintsResults = parsedBody.ResultSet.Result;
            var hints = [];
            for (var i = 0; i < hintsResults.length; i++) {
              hints.push(hintsResults[i].symbol);
            }
            // console.log("hints:");
            // console.log(hints);


            var searchSymbol = hint; // set searchSymbol to hint that user selects
            var _start = new Date(begin);
            var _endDate = new Date(end);

            // console.log("req.body for yahoo api call");
            // console.log(req.body);
            // console.log("");
            // console.log("req.params for yahoo api call");
            // console.log(req.params);
            // console.log("");
            // console.log("Ticker symbol: " + searchSymbol)
            // console.log("");
            // console.log("---------- Body ----------");
            // console.log(parsedBody);
            // console.log("");
            // console.log("---------- parsedBody.ResultSet ----------");
            // console.log(parsedBody.ResultSet);
            // console.log("");

            // Stock price data
            historic(searchSymbol, _start, _endDate, (err, data) => {
                // console.log("---------- Stock price data ----------");
                // console.log(err ? err : data);
                // console.log("");
                if (data !== null) {
                var stockData = data;
                var stockDates = [];
                var stockPriceOpen = [];
                var stockPriceClose = [];
                var stockPriceHigh = [];
                var stockPriceLow = [];

                if (err) {
                  console.log(err);
                }

                for (var i = 0; i < stockData.length; i++) {
                  stockDates.push(stockData[i].Date);
                  stockPriceOpen.push(stockData[i].Open);
                  stockPriceClose.push(stockData[i].Close);
                  stockPriceHigh.push(stockData[i].High);
                  stockPriceLow.push(stockData[i].Low);
                }
                // console.log("stockDates");
                // console.log(stockDates);
                // console.log("");

                // ===================== NYT API =====================
                request.get({
                    url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
                    qs: {
                        'api-key': "ca8dc29b335f42e38d35846c5e4ba65f",
                        'fq': "headline: \"" + searchTerm + "\"",
                        'begin_date': beginDate,
                        'end_date': endDate,
                        'sort': "oldest",
                        'page': page
                    },
                }, function(err, response, body) {
                    body = JSON.parse(body);
                    // console.log("number of NYT article hits: " + body.response.meta.hits);

                    var articles = body.response.docs;

                    // console.log("---------- Search Results ----------");
                    // console.log("");

                    for (var i = 0; i < articles.length; i++) {
                        articles[i].pub_date = moment.utc(articles[i].pub_date).add(-4,'hours').format('YYYY-MM-DD');
                        // console.log("Headline: " + articles[i].headline.main);
                        // console.log("Snippet: " + articles[i].snippet);
                        // console.log("Source: " + articles[i].source);
                        // console.log("Publication Date: " + articles[i].pub_date);
                        // console.log("URL: " + articles[i].web_url);
                        // console.log("");
                    }
                    // console.log("articles");
                    // console.log(articles);

                    var hbsObject = {
                        articles: articles,
                        numberOfResults: body.response.meta.hits,
                        offsetStart: (body.response.meta.offset + 1),
                        offsetEnd: (body.response.meta.offset + articles.length),
                        page: req.params.page,
                        searchTerm: searchTerm,
                        begin: begin,
                        end: end,
                        stockData: stockData,
                        stockDates: stockDates,
                        stockPriceOpen: stockPriceOpen.reverse(),
                        stockPriceClose: stockPriceClose.reverse(),
                        stockPriceHigh: stockPriceHigh.reverse(),
                        stockPriceLow: stockPriceLow.reverse(),
                    }
                    module.exports = app
                    res.render('results', hbsObject);
                }); //end request.get({}) for NYT API
                // ===================== end NYT API =====================
              }
              else {
                res.redirect('/');
              }
            }); // end historic function
        } // end if statement
    });// end request
    // console.log('searchTerm after request: ' + searchTerm)
    // console.log("");
}); //end /results/:page post route

app.get('/sign-up', function (req, res) {
  res.render('sign-up', {layout: 'blank'});
});

app.post('/sign-up', function (req, res) {
  User.findOne({email: req.body.email}, function (err, user) {
    if (!user) {
      if (req.body.password == req.body.confirmPassword) {
        bcrypt.genSalt(10, function(err, salt) {
          bcrypt.hash(req.body.password, salt, function(err, hash) {
            // create a new user
            var newUser = User({
              name: req.body.name,
              email: req.body.email,
              password_hash: hash
            });
            // save the user
            newUser.save(function(err) {
              if (err) throw err;
              console.log('User created!');
            });

          });
        });
        // establish session
        req.session.logged_in = true;
        req.session.name = req.body.name;
        res.render('/');
      }
      else {
        res.send("Passwords do not match. Please go back and try again.");
      }
    }
    else {
      res.send("An account with that email already exists. Please go back and try again.");
    }
  });
});

app.get('/sign-in', function (req, res) {
    res.render('sign-in', {layout: 'blank'});
});

app.post('/sign-in', function (req, res) {
  User.findOne({email: req.body.email}, function (err, user) {
    if (!user) {
      res.send("User not found. Please go back and try again");
    }
    else {
      bcrypt.compare(req.body.password, user.password_hash, function(err, result) {
        if (result == true) {
        req.session.logged_in = true;
        req.session.name = user.name;
        console.log("User has logged in");
        res.redirect('/');
        } else {
            res.send("Password incorrect. Please go back and try again.");
        }
      });// end bcrypt
    }// end else
  });// end User.findOne
});// end /sign-in post route

app.get('/sign-out', function(req, res) {
    req.session.destroy(function(err) {
        res.redirect('/')
    })
});

var port = process.env.PORT || 3001
app.listen(port);
console.log('Listening on port: ' + port);
