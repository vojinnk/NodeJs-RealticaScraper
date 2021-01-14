const cheerio = require("cheerio");
const fs = require("fs");
const axios = require("axios");
const objectsToCsv = require("objects-to-csv");
const { contains } = require("cheerio");
const filePath = __dirname+"/listings.csv";
const csvToJson=require("csvtojson");

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
function createListing(url,info,pictures,elemID){
  let naslov =  checkInfo(info,/<h2>(.*?)<\/h2>/);
  let vrsta = checkInfo(info,/<strong>Vrsta<\/strong>: (.*?)<br>/);
  let podrucje = checkInfo(info,/<strong>Područje<\/strong>: (.*?)<br>/);
  let lokacija = checkInfo(info,/<strong>Lokacija<\/strong>: (.*?)<br>/);
  let brSpavacihSoba= parseInt(checkInfo(info,/<strong>Spavaćih Soba<\/strong>: (.*?)<br>/));
  let brKupatila= parseInt(checkInfo(info,/<strong>Kupatila<\/strong>: (.*?)<br>/));
  let cijena = parseFloat(checkInfo(info,/<strong>Cijena<\/strong>: €(.*?)<br>/).replace(".",""));
  let stambenaPovrsina= parseInt(checkInfo(info,/<strong>Stambena Površina<\/strong>: (.*?) m<font/));

  let zemljiste= parseInt(checkInfo(info,/<strong>Zemljište<\/strong>: (.*?) m<font/));
  let parkingMjesta= parseInt(checkInfo(info,/<strong>Parking Mjesta<\/strong>: (.*?)<br>/));
  let odMora= parseInt(checkInfo(info,/<strong>Od Mora \(m\)<\/strong>: (.*?)<br>/));
  let novogradnja= /<strong>Novogradnja<\/strong>/.test(info);
  let klima= /<strong>Klima Uređaj<\/strong>/.test(info);
  
 // let opis= checkInfo(info,/<strong>Opis<\/strong>:(.*?)<!--/);
  //let webStr= checkInfo(info,/<strong>Stambena Površina<\/strong>: (.*?)<br>/);
  const $= cheerio.load(info);
  let oglasio= $("div#aboutAuthor > a").text();
  let mobilni= checkInfo(info,/<strong>Mobitel<\/strong>: (.*?)<br>/);
  let zadnjaPromjena= Date.parse(checkInfo(info,/<strong>Zadnja Promjena<\/strong>: (.*?)\n<br>/));
  

  let obj = {
    Naslov: naslov,
    "Oglas broj":elemID,
    Vrsta: vrsta,
    Podrucje: podrucje,
    Lokacija:lokacija,
    "Broj spavacih soba":brSpavacihSoba,
    "Broj kupatila":brKupatila,
    Cijena: cijena,
    "Stambena povrsina":stambenaPovrsina,
    Zemljiste:zemljiste,
    "Parking mjesta":parkingMjesta,
    "Od mora":odMora,
    Novogradnja:novogradnja,
    Klima:klima,
    // Opis:opis,
     Oglasio:oglasio,
     Mobilni:mobilni,
     "Zadnja promjena":zadnjaPromjena,
     Slike: pictures,
     url: url,
   }
   
   return obj;
 }
 

function checkExistence(array,id){
    let exists=false;
    array.forEach(elem=>{
      /*console.log("testiranje:")
      console.log(elem["Oglas broj"]);
      console.log(id);
      console.log(elem["Oglas broj"]==id)*/
      
      if(elem["Oglas broj"]==id){
        //console.log(true);
        exists=true;
      }
    })

    //console.log(exists);
    return exists;
    
    
}

async function scrapListings(){
  console.log("Scraping started")
  let links = await getLinks();
  let previous=false;
  let previousData = null;
  let filteredLinks;
  let listingData;
  try {
    if(fs.existsSync(filePath)){
    console.log("previous data exists");
    previous=true;
    previousData= await csvToJson().fromFile(filePath);
   
    }else{
      console.log("no previous data!")
    }
  } catch (error) {
    console.log(error);
  }
  
    //let listingData=[]
    if(previous){
      filteredLinks = links.filter(elem=>{
        let pathLast = elem.split("/");
        let elemID = pathLast[pathLast.length-1];
        return !(checkExistence(previousData,elemID));
      });
    }
    else{
      filteredLinks=links;
    }
    //console.log(filteredLinks.length);
    if(filteredLinks.length>0){
      //mnogo je brze nego sa petljom!
        listingData = await Promise.all(filteredLinks.map(async (elem)=>{
        let pathLast = elem.split("/");
        let elemID = pathLast[pathLast.length-1];
          let listing = await fetchPage(elem);
          let $ = cheerio.load(listing);
          let info = $("body div#listing_body").html();
          let pictures= $("body #rea_blueimp a").toArray().map(elem=>{
            return $(elem).attr("href");
          });
          
          let obj=createListing(elem,info,pictures,elemID);
          return obj; 
        }));
        await writeData(listingData);
        console.log(`Added ${filteredLinks.length} new listings`);
        
        
        
      }else{
        console.log("No new data!!!")
        
      }
      let allData=await csvToJson().fromFile(filePath);

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
    
    return allData;
    
}

module.exports = scrapListings;
