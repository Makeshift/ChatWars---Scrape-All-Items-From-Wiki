const request = require('request-promise');
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');

const config = {
    baseUrl: "https://chatwars-wiki.de/api.php?action=ask&format=json&query=",
    toMongo: false,
    toFile: true,
    mongo: {
        url: "mongodb://localhost:27017/ChatWars"
    }
}


//General Item List Query
let generalItemQuery = `\
[[ItemID::+]]
|mainlabel=Item Name
|limit=1000
|offset=0
|sort=ItemID
|order=asc
|?CraftCommand
|?DetailedDescription
|?Event
|?ItemSubType
|?ArmorClass
|?Attack
|?Defense
|?Mana
|?Stamina
|?InventoryIncrease
|?Luck
|?BaseDuration
|?PotionEffect
|?Wrapping
|?LevelEquipRequirement
|?Ammunition
|?ShopSellPrice
|?ShopBuyPrice
|?BoolRecipeIncomplete
|?SkillCraft
|?SkillCraftLevel
|?ManaCrafting
|?PerceptionLevel
|?QuestSwampMorning
|?QuestSwampDay
|?QuestSwampEvening
|?EnchantAtk1
|?EnchantAtk2
|?EnchantAtk3
|?EnchantAtk4
|?EnchantDef1
|?EnchantDef2
|?EnchantDef3
|?EnchantDef4
|?EnchantMana1
|?EnchantMana2
|?EnchantMana3
|?EnchantMana4
|?ItemID
|?BoolEventItem
|?ItemType
|?note
|?Weight
|?BoolDepositGuild
|?BoolExchange
|?BoolAuction
|?BoolQuest
|?PlayerQuestMinLevel
|?QuestForestMorning
|?QuestForestDay
|?QuestForestEvening
|?QuestForestNight
|?QuestSwampNight
|?QuestValleyMorning
|?QuestValleyDay
|?QuestValleyEvening
|?QuestValleyNight
|?QuestForayMorning
|?QuestForayDay
|?QuestForayEvening
|?QuestForayNight
|?BoolEnchantment
|?BoolCraft\
`
go();
async function go() {
    //const items = await (await (await MongoClient.connect(config.mongo.url, {useNewUrlParser: true})).db()).collection('items');
    let itemList = await fixObjLayout(await get(generalItemQuery));
    Object.keys(itemList).forEach(async key => {
        itemList[key].recipe = await getItemRecipe(itemList[key].name)
    }) 
    let write = fs.createWriteStream("items.json");
    Object.keys(itemList).forEach(async key => {
        let item = itemList[key];
        write.write(JSON.stringify(item) + "\n");
    })
    write.end();
}

async function getItemRecipe(itemName) {
    let query = `\
[[-Has subobject::${itemName}]] [[Crafting ingredient.ItemType::+]]
|?Crafting ingredient
|?Qty\
    `
    let recipe = await get(query)
    let cleanedRecipe = {};
    Object.keys(recipe.query.results).forEach(a => {
        let printouts = recipe.query.results[a].printouts;
        cleanedRecipe[printouts["Crafting ingredient"][0].fulltext] = printouts.Qty[0];
    })
    return cleanedRecipe;
}

async function fixObjLayout(obj) {
    let results = obj.query.results;
    let cleaned = [];
    Object.keys(results).forEach(function(key) {
        let finalObj = {};
        let itemObject = results[key];
        Object.keys(itemObject).forEach(b => {
            if (b === "printouts") {
                Object.keys(itemObject[b]).forEach(c => {
                    finalObj[c] = arrayCleaner(itemObject[b][c]);
                })
            } else {
                finalObj[b] = arrayCleaner(itemObject[b]);
            }
        })
        finalObj.ItemType = finalObj.ItemType.fulltext;
        finalObj.ItemSubType = finalObj.ItemSubType.fulltext || "";
        finalObj.name = finalObj.fulltext;
        finalObj._id = finalObj.ItemID;
        let toDelete = ["fullurl", "ItemID", "Note", "fulltext", "namespace"];
        Object.keys(finalObj).forEach(a => {
            if (finalObj.hasOwnProperty(a) && finalObj[a].length === 0) {
                toDelete.push(a)
            }
        })
        toDelete.forEach(a => {
            delete finalObj[a];
        })
        cleaned.push(finalObj);
    })
    return cleaned;
}

function arrayCleaner(item) {
    let cleanedItem;
    if (Array.isArray(item) && item.length === 1) {
        cleanedItem = item[0];
    } else {
        cleanedItem = item;
    }
    if (cleanedItem === "f") {
        cleanedItem = false;
    } else if (cleanedItem === "t") {
        cleanedItem = true;
    }
    return cleanedItem;
}

async function get(query) {
    query = config.baseUrl + encodeURIComponent(query);
    console.log("Querying", query)
    let queryResponse = await request(query);
    return JSON.parse(queryResponse);
}

