const express = require("express");
const router = express.Router();
const path = require("path");

const axios = require("axios");
const cheerio = require("cheerio");
const Comment = require("../models/Comment.js");
const Article = require("../models/Article.js");


router.get("/", function(req,res){
    res.redirect("/articles");
});

// A GET route for scraping the NYTImes website
router.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    request("http://www.nytimes.com/").then(function (error,response,html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        let $ = cheerio.load(response.data);

        // Now, we grab every h2 within an article tag, and do the following:
        $("article h2").each(function (i, element) {
            // Save an empty result object
            let result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("a")
                .text();
            result.link = $(this)
                .children("a")
                .attr("href");

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });

        // Send a message to the client
        res.send("Scrape Complete");
        console.log("Scrape Complete.");
    });
});
