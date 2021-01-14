const express = require("express");
const app = express();
const nodeCron = require("node-cron");


nodeCron.schedule('0 0 */1 * * *', () => {
    console.log('running a task every hour');
    scrapListings();
  });

const scrapListings = require("./scraper");

app.get("/listings",async function(req,res){
    const result = await scrapListings();
    res.send(result);
})

app.listen(3000,()=>{
    console.log("Server started")
})