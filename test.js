const fs = require("fs");
const objectsToCsv = require("objects-to-csv");

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

let test = convertToJson(fs.readFileSync("./username.csv").toString());
//writeData(test);
//console.log(test);


async function writeData(data){

    let toCsv = new objectsToCsv(data);
    await toCsv.toDisk("./newfile.csv",{append:true});
}