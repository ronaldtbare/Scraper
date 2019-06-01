const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

// Our scraping tools

const axios = require("axios");
const cheerio = require("cheerio");

// Require all models
var models = require("./models");
mongoose.Promise = Promise;
// Initialize Express

const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");



// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/unit18Populater", { useNewUrlParser: true });
// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scraped_newsdb";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
var db = mongoose.connection;

db.on("error",console.error.bind(console,"connection error:"));
db.once("open", function(){
    console.log("Connected to Mongoose!");
})

// port setup
const PORT = process.env.PORT || 3000;

app.get("/", function(req,res) {
    res.render("index");
});

app.get("/scrape", function (req, res) {

    axios.get("http://www.nytimes.com").then(function (res) {
        var $ = cheerio.load(res.data);
              // Make an empty array to save our article info
        var articles = [];

        // Now, find and loop through each element that has the "css-180b3ld" class
        // (i.e, the section holding the articles)
        $("div.css-1100km").each(function (i, element) {
            // In each article section, we grab the child with the class story-heading
console.log(element);
            // Then we grab the inner text of the this element and store it
            // to the head variable. This is the article headline
            var head = $(this)
                .find("h2")
                .text()
                .trim();

            // Grab the URL of the article
            var url = $(this)
                .find("a")
                .attr("href");

            // Then we grab any children with the class of summary and then grab it's inner text
            // We store this to the sum variable. This is the article summary
            var sum = $(this)
                .find("p")
                .text()
                .trim();

            // So long as our headline and sum and url aren't empty or undefined, do the following
            if (head && sum && url) {
                // This section uses regular expressions and the trim function to tidy our headlines and summaries
                // We're removing extra lines, extra spacing, extra tabs, etc.. to increase to typographical cleanliness.
                var headNeat = head.replace(/(\r\n|\n|\r|\t|\s+)/gm, " ").trim();
                var sumNeat = sum.replace(/(\r\n|\n|\r|\t|\s+)/gm, " ").trim();

                // Initialize an object we will push to the articles array

                var dataToAdd = {
                    headline: headNeat,
                    summary: sumNeat,
                    url: "https://www.nytimes.com" + url
                };

                articles.push(dataToAdd);
            }
        });
        return articles;
    }).then(function(articles) {
        // then insert articles into the db
console.log(articles);

        // return db.Article.create(articles);
      })
      .then(function(dbHeadline) {
        if (dbHeadline.length === 0) {
          res.json({
            message: "No new articles today. Check back tomorrow!"
          });
        }
        else {
          // Otherwise send back a count of how many new articles we got
          res.json({
            message: "Added " + dbHeadline.length + " new articles!"
          });
        }
      })
      .catch(function(err) {
        // This query won't insert articles with duplicate headlines, but it will error after inserting the others
        console.log(err);
        res.json({
          message: "Error with Scrape complete!!"
        });
      })
        
});
// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    models.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    models.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("comment")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    models.Comment.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return models.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
