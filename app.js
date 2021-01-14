const express = require("express");
const app = express();

const scrapListings = require("./scraper");

app.get("/listings",async function(req,res){
    const result = await scrapListings();
    res.send(result);
})

app.listen(3000,()=>{
    console.log("Server started")
})