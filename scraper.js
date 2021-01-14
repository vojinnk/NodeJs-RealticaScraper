const cheerio = require("cheerio");
const fs = require("fs");
const axios = require("axios");
const objectsToCsv = require("objects-to-csv");
const { contains } = require("cheerio");
const filePath = __dirname+"/listings.csv";

async function fetchPage(url){
    try {
        const { data } = await axios.get(url);
        return data;
      } catch {
        console.error(
          `ERROR: An error occurred while trying to fetch the URL: ${url}`
        );
      }
}

function convertToJson(csv){
  let data = csv.split("\n");
  //console.log(data);
  let res = [];
  let headers = data[0].split(",");
  //console.log(headers);
  for(let i=1;i<data.length;i++){
      let obj={};
      let curr = data[i].split(",")
      for(let j=0;j<headers.length;j++){
          
          obj[headers[j]]=curr[j];
      }
      res.push(obj);
      
    
  }
  return res;
}


async function writeData(data){

  let toCsv = new objectsToCsv(data);
  await toCsv.toDisk(filePath,{append:true});
}

async function getLinks(){
  const searchUrl = "https://www.realitica.com/index.php?for=Prodaja&pZpa=Crna+Gora&pState=Crna+Gora&type%5B%5D=&price-min=&price-max=&qry=&lng=hr";
    const searchData = await fetchPage(searchUrl);
    const $ = cheerio.load(searchData);
    
    let links = $("body div.thumb_div > a").toArray().map((elem)=>{
        return $(elem).attr("href");
    })
    let i=1;
    let max=-1
    
    let ukupno = parseInt(searchData.match(/ukupno(.*?);<strong>(.*?)<\/strong>/)[2]);
    
    if(ukupno/20>100){
      max=100;
    }
    else{
      max = Math.floor(ukupno/20);//floor zato sto stanice krecu od 0! 
    }

    //rijesiti i ovo sa promisom
    while(i<=max)
    //for(i=1;i<=max;i++)
    {    
      let nextUrl=`https://www.realitica.com/?cur_page=${i}&for=Prodaja&pZpa=Crna+Gora&pState=Crna+Gora&type%5B%5D=&lng=hr`
      let newData = await fetchPage(nextUrl);
      
      let $ = cheerio.load(newData);
      $("body div.thumb_div > a").toArray().forEach(elem=>{
         links.push($(elem).attr("href"));
      })
      i++;  
    }
    return links;
    
}
function checkInfo(info,regex){
  if(info.match(regex)){
    return info.match(regex)[1];
  }else{
    return "null"
  } 
}
function createListing(info,pictures,elemID){
  let naslov =  checkInfo(info,/<h2>(.*?)<\/h2>/);
  let vrsta = checkInfo(info,/<strong>Vrsta<\/strong>: (.*?)<br>/);
  let podrucje = checkInfo(info,/<strong>Područje<\/strong>: (.*?)<br>/);
  let cijena = checkInfo(info,/<strong>Cijena<\/strong>: (.*?)<br>/);
  let obj = {
    Naslov: naslov,
    Vrsta: vrsta,
    Podrucje: podrucje,
    Cijena: cijena,
    Slike: pictures,
    "Oglas broj":elemID,
  }
  
  return obj;
}
function containsID(arr,id){
  arr.forEach(elem=>{
    if(elem["Oglas Broj"]==id){
      return true
    }
  })
  return false;
}

async function scrapListings(){
  let links = await getLinks();
    //let listingData=[]
    //mnogo je brze nego sa petljom!
    let listingData = await Promise.all(links.map(async (elem)=>{
      let pathLast = elem.split("/");
      let elemID = pathLast[pathLast.length-1];  
      //console.log(pathLast);

      let listing = await fetchPage(elem);
      let $ = cheerio.load(listing);
      let info = $("body div#listing_body").html();
      let pictures= $("body #rea_blueimp a").toArray().map(elem=>{
        return $(elem).attr("href");
      });
      let obj=createListing(info,pictures,elemID);
    //  listingData.push(obj);
      return obj;
    }));

    //let i=0;
    /*for(let i=0;i<links.length;i++)
    {
      let elem=links[i];
      //console.log(elem);
      let pathLast = elem.split("/");
      let elemID = pathLast[pathLast.length-1];  
      //console.log(pathLast);
    
        let listing = await fetchPage(elem);
        let $ = cheerio.load(listing);
        let info = $("body div#listing_body").html();
        let pictures= $("body #rea_blueimp a").toArray().map(elem=>{
          return $(elem).attr("href");
        });
        let obj=createListing(info,pictures,elemID);
        listingData.push(obj);
        //console.log(obj);
        
        //i++;    
    }*/

    console.log("Scraping done");
    await writeData(listingData);
    
    return listingData;
    

}

module.exports = scrapListings;
