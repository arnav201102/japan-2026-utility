/* Japan 2026 — Bakugai: the watch guide, other things worth buying, India
   customs, the duty calculator and the spending scenarios.
   Data and the maths only, no DOM. index.html loads it with a <script> tag;
   tests/bakugai.test.js loads it with require(). Edit prices and rates here.

   Every rupee figure is worked out from jp_tag_jpy at run time, so a new
   exchange rate (the live one from the Money tab) moves everything at once. */
(function (root) {

var CONFIG = {
  jpy_to_inr: 0.62,           /* used only until a live rate arrives — mid-market */
  card_markup_pct: 0,         /* zero-forex cards: you pay the network rate, no markup */
  tax_refund_pct: 10,         /* consumption tax, already inside the tag price */
  tax_refund_min_jpy: 5000,   /* tax-excluded, per shop per day — below this, no refund */
  india_duty_free_inr: 75000, /* Baggage Rules 2026, per person, can't be pooled */
  budget_inr: 50000,
  band_inr: 5000,
  data_as_of: "2026-10-24",

  /* India customs — Baggage Rules 2026, Notification 14/2026-Customs (N.T.) */
  baggage_duty_rate_pct: 35,         /* Notification 26/2016-Customs, as amended by 04/2026 */
  baggage_duty_rate_alt_pct: 10,     /* heading 9804, post and courier — not baggage; for comparison */
  social_welfare_surcharge_pct: 10,  /* baggage (heading 9803) exempt since 2 Feb 2025, Notification 07/2025 */
  surcharge_on_baggage: false,
  laptop_exempt: true,               /* one new laptop or notepad per adult, Rule 5 proviso */
  alcohol_free_litres: 2,
  cigarettes_free_sticks: 100,
  default_saving_pct: 30,            /* average Japan saving, for the India comparison */
  scenario_spends_inr: [50000, 100000, 150000, 200000, 250000],
  scenario_laptop_inr: 95000
};

/* jp_tag_jpy is the tax-inclusive shop price. india_inr is approximate MRP, null
   where it isn't officially sold in India. Links are official brand pages that
   were opened and checked; null where none could be confirmed. */
var WATCHES = [
 {id:"casio-f91w",band:"0-5k",brand:"Casio",model:"F-91W",category:"digital",movement:"quartz",jp_tag_jpy:1800,india_inr:1295,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/casio/product.F-91W-1/",link_verified:true,notes:"below refund minimum; India MRP is F-91W-1"},
 {id:"casio-a168wa",band:"0-5k",brand:"Casio",model:"A168WA",category:"digital",movement:"quartz",jp_tag_jpy:4000,india_inr:2695,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/casio/product.A168WA-1/",link_verified:true,notes:"below refund minimum; India MRP is A168WA-1"},
 {id:"casio-ae1200wh",band:"0-5k",brand:"Casio",model:"AE-1200WH",category:"digital",movement:"quartz",jp_tag_jpy:4500,india_inr:2995,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/casio/product.AE-1200WH-1BV/",link_verified:true,notes:"below refund minimum; India MRP is AE-1200WH-1BV"},
 {id:"casio-mq24",band:"0-5k",brand:"Casio",model:"MQ-24",category:"analog",movement:"quartz",jp_tag_jpy:1500,india_inr:1195,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/casio/product.MQ-24-7B2L/",link_verified:true,notes:"below refund minimum; India MRP is MQ-24-7B2L"},
 {id:"casio-mrw200h",band:"0-5k",brand:"Casio",model:"MRW-200H",category:"analog",movement:"quartz",jp_tag_jpy:3000,india_inr:2195,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/casio/product.MRW-200H-1BV/",link_verified:true,notes:"below refund minimum; India MRP is MRW-200H-1BV"},
 {id:"qq-falcon",band:"0-5k",brand:"Citizen",model:"Q&Q Falcon",category:"analog",movement:"quartz",jp_tag_jpy:3000,india_inr:null,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"rarely sold in India; not on Q&Q's official lineup"},

 {id:"gshock-dw5600e",band:"5-10k",brand:"Casio",model:"G-Shock DW-5600E",category:"digital",movement:"quartz",jp_tag_jpy:11000,india_inr:8000,japan_only:false,india_price_verified:false,link:"https://www.casio.com/in/watches/gshock/product.DW-5600E-1VQ/",link_verified:true,notes:"India page marked discontinued"},
 {id:"gshock-ga2100",band:"5-10k",brand:"Casio",model:"G-Shock GA-2100",category:"analog-digital",movement:"quartz",jp_tag_jpy:16000,india_inr:9195,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/gshock/product.GA-2100-1A1/",link_verified:true,notes:"India MRP is GA-2100-1A1"},
 {id:"casio-mdv106",band:"5-10k",brand:"Casio",model:"Duro MDV-106",category:"diver",movement:"quartz",jp_tag_jpy:10000,india_inr:8000,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"no India or Japan page; sold mainly in the US"},
 {id:"edifice-entry",band:"5-10k",brand:"Casio",model:"Edifice entry chronograph",category:"chronograph",movement:"quartz",jp_tag_jpy:13500,india_inr:9995,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/edifice/product.EFV-650D-2AV/",link_verified:true,notes:"link and India MRP are one example, EFV-650D-2AV"},
 {id:"citizen-collection-qz",band:"5-10k",brand:"Citizen",model:"Citizen Collection quartz",category:"dress",movement:"quartz",jp_tag_jpy:14000,india_inr:11000,japan_only:false,india_price_verified:false,link:"https://www.citizenwatches.co.in/products/quartz",link_verified:true,notes:""},
 {id:"seiko-selection-qz",band:"5-10k",brand:"Seiko",model:"Seiko Selection quartz",category:"dress",movement:"quartz",jp_tag_jpy:15000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.seikowatches.com/jp-ja/products/seikoselection/mens-quartz",link_verified:true,notes:"official list ¥22,000 and up — most are ¥26,400–38,500"},

 {id:"gshock-gwm5610u",band:"10-15k",brand:"Casio",model:"G-Shock GW-M5610U",category:"digital",movement:"solar radio-controlled",jp_tag_jpy:20000,india_inr:14000,japan_only:false,india_price_verified:false,link:"https://www.casio.com/jp/watches/gshock/product.GW-M5610U-1/",link_verified:true,notes:""},
 {id:"gshock-gab2100",band:"10-15k",brand:"Casio",model:"G-Shock GA-B2100",category:"analog-digital",movement:"solar bluetooth",jp_tag_jpy:23000,india_inr:11995,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/gshock/product.GA-B2100-1A1/",link_verified:true,notes:"India MRP is GA-B2100-1A1"},
 {id:"orient-bambino",band:"10-15k",brand:"Orient",model:"Bambino",category:"dress",movement:"automatic",jp_tag_jpy:23000,india_inr:19000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orient/collection/classic/bambino/",link_verified:true,notes:"official list from ¥44,000; discount shops often far lower"},
 {id:"orient-ray-mako",band:"10-15k",brand:"Orient",model:"Ray / Mako",category:"diver",movement:"automatic",jp_tag_jpy:24000,india_inr:20000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orient/collection/sports/mako/",link_verified:true,notes:"link is the Mako series; Ray isn't on Orient's site any more"},
 {id:"citizen-ecodrive",band:"10-15k",brand:"Citizen",model:"Eco-Drive Collection",category:"dress",movement:"solar",jp_tag_jpy:22000,india_inr:16000,japan_only:false,india_price_verified:false,link:"https://www.citizenwatches.co.in/products/eco-drive",link_verified:true,notes:""},
 {id:"lineage-entry",band:"10-15k",brand:"Casio",model:"Lineage (entry)",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:24000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.casio.com/jp/watches/casio/product.LIW-120DEJ-1A/",link_verified:true,notes:"link is one example, LIW-120DEJ-1AJF at ¥22,000"},

 {id:"gshock-gwb5600",band:"15-20k",brand:"Casio",model:"G-Shock GW-B5600",category:"digital",movement:"solar radio-controlled bluetooth",jp_tag_jpy:28000,india_inr:21000,japan_only:false,india_price_verified:false,link:"https://www.casio.com/in/watches/gshock/products/digital/gw-b5600/",link_verified:true,notes:""},
 {id:"gshock-gm2100",band:"15-20k",brand:"Casio",model:"G-Shock GM-2100",category:"analog-digital",movement:"quartz",jp_tag_jpy:30000,india_inr:15995,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/gshock/product.GM-2100-1A/",link_verified:true,notes:"India MRP is GM-2100-1A"},
 {id:"orient-kamasu",band:"15-20k",brand:"Orient",model:"Kamasu",category:"diver",movement:"automatic",jp_tag_jpy:32000,india_inr:28000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orient/collection/sports/mako/",link_verified:true,top_pick:true,notes:"sold as Mako RN-AA0001B/0002L/0003R in Japan; official list ¥48,400"},
 {id:"citizen-bn0150",band:"15-20k",brand:"Citizen",model:"Promaster BN0150",category:"diver",movement:"solar",jp_tag_jpy:31000,india_inr:25000,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"not on Citizen India or Japan; only Citizen US lists it"},
 {id:"prospex-solar-diver",band:"15-20k",brand:"Seiko",model:"Prospex solar diver",category:"diver",movement:"solar",jp_tag_jpy:34000,india_inr:30000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/prospex/sea",link_verified:true,notes:"Seiko India lists SNE595 at ₹60,000 — check which model the tag is for"},
 {id:"lineage-lcwm170",band:"15-20k",brand:"Casio",model:"Lineage LCW-M170",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:30000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.casio.com/jp/watches/casio/product.LCW-M170D-1A/",link_verified:true,notes:"official list ¥29,700 (LCW-M170D-1AJF)"},

 {id:"seiko5-sports",band:"20-25k",brand:"Seiko",model:"5 Sports",category:"sport",movement:"automatic",jp_tag_jpy:39000,india_inr:29000,japan_only:false,india_price_verified:true,link:"https://www.seikowatches.com/in-en/products/5sports",link_verified:true,notes:"India price is SRE005, the cheapest 5 Sports SKX"},
 {id:"orient-sun-moon",band:"20-25k",brand:"Orient",model:"Sun & Moon",category:"dress",movement:"automatic",jp_tag_jpy:40000,india_inr:30000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orient/collection/classic/sun-and-moon/",link_verified:true,notes:"official list from ¥60,500; discount shops lower"},
 {id:"gshock-mudmaster",band:"20-25k",brand:"Casio",model:"G-Shock Mudmaster",category:"outdoor",movement:"solar",jp_tag_jpy:40000,india_inr:30000,japan_only:false,india_price_verified:false,link:"https://gshock.casio.com/in/products/mudmaster/gwg-b1000/",link_verified:true,notes:""},
 {id:"protrek-prw3500",band:"20-25k",brand:"Casio",model:"Pro Trek PRW-3500",category:"outdoor",movement:"solar radio-controlled",jp_tag_jpy:38000,india_inr:28000,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"no India or Japan page; likely discontinued"},
 {id:"citizen-promaster-land",band:"20-25k",brand:"Citizen",model:"Promaster Land",category:"field",movement:"solar",jp_tag_jpy:40000,india_inr:32000,japan_only:false,india_price_verified:false,link:"https://www.citizenwatches.co.in/products/promaster",link_verified:true,notes:""},
 {id:"lineage-lcwm300",band:"20-25k",brand:"Casio",model:"Lineage LCW-M300",category:"chronograph",movement:"solar radio-controlled",jp_tag_jpy:40000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.casio.com/jp/watches/casio/product.LCW-M300DB-1A/",link_verified:true,notes:"official list ¥37,400 (LCW-M300DB-1AJF)"},

 {id:"presage-cocktail",band:"25-30k",brand:"Seiko",model:"Presage Cocktail Time",category:"dress",movement:"automatic",jp_tag_jpy:50000,india_inr:47000,japan_only:false,india_price_verified:true,link:"https://www.seikowatches.com/in-en/products/presage/cocktailtime-bk/datedisplay/lineup",link_verified:true,top_pick:true,notes:"India price is SRPB41 on Seiko India; Japan's own SARY versions start at ¥60,500"},
 {id:"seiko5-gmt",band:"25-30k",brand:"Seiko",model:"5 Sports GMT",category:"sport",movement:"automatic",jp_tag_jpy:50000,india_inr:40000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/5sports/ssk001",link_verified:true,notes:"Seiko India lists the SSK GMTs at ₹55,000"},
 {id:"speedtimer-solar",band:"25-30k",brand:"Seiko",model:"Prospex Speedtimer solar",category:"chronograph",movement:"solar",jp_tag_jpy:50000,india_inr:45000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/prospex/speedtimer",link_verified:true,notes:"Seiko India lists the solar SSC chronographs at ₹75,000–80,000"},
 {id:"gshock-gw9400",band:"25-30k",brand:"Casio",model:"G-Shock Rangeman GW-9400",category:"outdoor",movement:"solar radio-controlled",jp_tag_jpy:45000,india_inr:33000,japan_only:false,india_price_verified:false,link:"https://gshock.casio.com/in/products/rangeman/gw-9400/",link_verified:true,notes:""},
 {id:"citizen-altichron",band:"25-30k",brand:"Citizen",model:"Promaster Altichron",category:"outdoor",movement:"solar",jp_tag_jpy:47000,india_inr:40000,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"only official Altichron page is a ¥154,000 limited edition — check the shelf"},
 {id:"edifice-premium",band:"25-30k",brand:"Casio",model:"Edifice premium",category:"sport",movement:"solar",jp_tag_jpy:45000,india_inr:35000,japan_only:false,india_price_verified:false,link:"https://www.casio.com/in/watches/edifice/products/collection/link-with-smartphone/eqb-1000/",link_verified:true,notes:"link is the EQB-1000 range"},

 {id:"prospex-turtle",band:"30-35k",brand:"Seiko",model:"Prospex Turtle",category:"diver",movement:"automatic",jp_tag_jpy:57000,india_inr:48000,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"Seiko doesn't use the Turtle name; nearest is SRPE03 at ₹65,000 in India"},
 {id:"presage-style60s",band:"30-35k",brand:"Seiko",model:"Presage Style60s",category:"dress",movement:"automatic",jp_tag_jpy:55000,india_inr:45000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/presage/style60s",link_verified:true,notes:"Seiko India: SRPL07/09 ₹55,000"},
 {id:"orient-star-classic",band:"30-35k",brand:"Orient",model:"Orient Star Classic",category:"dress",movement:"automatic",jp_tag_jpy:57000,india_inr:45000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orientstar/collection/classic/",link_verified:true,notes:"official list from ¥90,200; discount shops lower"},
 {id:"gshock-frogman-resin",band:"30-35k",brand:"Casio",model:"G-Shock Frogman (resin)",category:"diver",movement:"solar radio-controlled",jp_tag_jpy:55000,india_inr:45000,japan_only:false,india_price_verified:false,link:"https://gshock.casio.com/in/products/frogman/gwf-a1000/",link_verified:true,notes:"link is the GWF-A1000 series"},
 {id:"attesa-entry",band:"30-35k",brand:"Citizen",model:"Attesa (entry)",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:57000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://citizen.jp/attesa/index.html",link_verified:true,notes:""},
 {id:"oceanus-classic",band:"30-35k",brand:"Casio",model:"Oceanus Classic Line",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:57000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.casio.com/jp/watches/oceanus/collection/",link_verified:true,notes:"mostly Japan-only; link is the Oceanus collections page"},

 {id:"presage-premium",band:"35-40k",brand:"Seiko",model:"Presage (premium dials)",category:"dress",movement:"automatic",jp_tag_jpy:65000,india_inr:56000,japan_only:false,india_price_verified:true,link:"https://www.seikowatches.com/in-en/products/presage/cocktailtime-bk/datedisplay/lineup",link_verified:true,notes:"SRPJ13 / SRPJ17 ₹55,000 and SRPG23 ₹57,000 on Seiko India"},
 {id:"speedtimer-premium",band:"35-40k",brand:"Seiko",model:"Prospex Speedtimer (premium)",category:"chronograph",movement:"solar",jp_tag_jpy:65000,india_inr:55000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/prospex/speedtimer",link_verified:true,notes:""},
 {id:"orient-star-diver",band:"35-40k",brand:"Orient",model:"Orient Star Diver",category:"diver",movement:"automatic",jp_tag_jpy:65000,india_inr:55000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orientstar/collection/sports/diver/",link_verified:true,notes:"official list ¥101,200; discount shops lower"},
 {id:"orient-star-moon",band:"35-40k",brand:"Orient",model:"Orient Star Moon Phase",category:"dress",movement:"automatic",jp_tag_jpy:67000,india_inr:55000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orientstar/collection/classic/m45_f7_mechanical-moon-phase/",link_verified:true,notes:"current M45 F7 lists at ¥187,000 — the ¥67,000 tag is an older or discounted model"},
 {id:"attesa-chrono",band:"35-40k",brand:"Citizen",model:"Attesa chronograph",category:"chronograph",movement:"solar radio-controlled",jp_tag_jpy:65000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://citizen.jp/attesa/index.html",link_verified:true,notes:""},
 {id:"oceanus-ocwt200",band:"35-40k",brand:"Casio",model:"Oceanus OCW-T200",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:65000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.casio.com/jp/watches/oceanus/product.OCW-T200S-1A/",link_verified:true,notes:"mostly Japan-only; official list ¥71,500 (OCW-T200S-1AJF)"},

 {id:"gshock-gmwb5000d",band:"40-45k",brand:"Casio",model:"G-Shock GMW-B5000D",category:"digital",movement:"solar radio-controlled bluetooth",jp_tag_jpy:72000,india_inr:47995,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/gshock/product.GMW-B5000D-1/",link_verified:true,top_pick:true,notes:"India MRP is GMW-B5000D-1; Japan list is ¥84,700, so the saving depends on finding it discounted"},
 {id:"gshock-gmb2100",band:"40-45k",brand:"Casio",model:"G-Shock GM-B2100",category:"analog-digital",movement:"solar radio-controlled bluetooth",jp_tag_jpy:74000,india_inr:47995,japan_only:false,india_price_verified:true,link:"https://www.casio.com/in/watches/gshock/product.GM-B2100D-1A/",link_verified:true,notes:"India MRP is GM-B2100D-1A"},
 {id:"prospex-samurai",band:"40-45k",brand:"Seiko",model:"Prospex Samurai",category:"diver",movement:"automatic",jp_tag_jpy:75000,india_inr:60000,japan_only:false,india_price_verified:false,link:null,link_verified:false,notes:"no longer on Seiko's India or Japan sites"},
 {id:"orient-star-skeleton",band:"40-45k",brand:"Orient",model:"Orient Star Skeleton",category:"dress",movement:"automatic",jp_tag_jpy:75000,india_inr:60000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orientstar/collection/classic/semi-skeleton/",link_verified:true,notes:"Classic Semi Skeleton lists from ¥55,000"},
 {id:"presage-sharp-edged",band:"40-45k",brand:"Seiko",model:"Presage Sharp Edged",category:"dress",movement:"automatic",jp_tag_jpy:77000,india_inr:70000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/presage/sharpedged",link_verified:true,notes:"Seiko India: SPB165/169/170 ₹89,000"},
 {id:"attesa-dual",band:"40-45k",brand:"Citizen",model:"Attesa dual-time",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:75000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://citizen.jp/attesa/index.html",link_verified:true,notes:""},

 {id:"prospex-alpinist",band:"45-50k",brand:"Seiko",model:"Prospex Alpinist",category:"field",movement:"automatic",jp_tag_jpy:85000,india_inr:75000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/prospex/special/alpinist",link_verified:true,notes:"many versions are now above ¥90,000; Seiko India: SPB503/505/507 ₹90,000"},
 {id:"presage-sharp-edged-hi",band:"45-50k",brand:"Seiko",model:"Presage Sharp Edged (higher)",category:"dress",movement:"automatic",jp_tag_jpy:85000,india_inr:75000,japan_only:false,india_price_verified:false,link:"https://www.seikowatches.com/in-en/products/presage/sharpedged",link_verified:true,notes:""},
 {id:"orient-star-mech",band:"45-50k",brand:"Orient",model:"Orient Star Mechanical Classic",category:"dress",movement:"automatic",jp_tag_jpy:80000,india_inr:65000,japan_only:false,india_price_verified:false,link:"https://orient-watch.com/ja/orientstar/collection/classic/",link_verified:true,notes:""},
 {id:"gshock-frogman-metal",band:"45-50k",brand:"Casio",model:"G-Shock Frogman (metal)",category:"diver",movement:"solar radio-controlled",jp_tag_jpy:85000,india_inr:70000,japan_only:false,india_price_verified:false,link:"https://www.casio.com/in/watches/gshock/product.GW-8200TPF-1/",link_verified:true,notes:"link is the titanium GW-8200TPF-1, ₹59,995 in India"},
 {id:"attesa-act",band:"45-50k",brand:"Citizen",model:"Attesa ACT Line",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:83000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://citizen.jp/cms/z_citizen/attesa/special/topics/act-line/index.html",link_verified:true,notes:""},
 {id:"oceanus-classic-hi",band:"45-50k",brand:"Casio",model:"Oceanus (higher Classic)",category:"dress",movement:"solar radio-controlled",jp_tag_jpy:82000,india_inr:null,japan_only:true,india_price_verified:false,link:"https://www.casio.com/jp/watches/oceanus/collection/",link_verified:true,notes:"mostly Japan-only; link is the Oceanus collections page"}
];

/* Lines only sold in Japan. The rupee ranges were worked out at ₹0.63 per yen
   with the refund taken off, and are scaled to whatever rate is in use. */
var JAPAN_ONLY = [
 {brand:"Seiko",line:"Presage SARY series",effective_inr_min:26000,effective_inr_max:35000,link:"https://www.seikowatches.com/jp-ja/products/presage/cocktailtime",link_verified:true,notes:"Japan versions of Cocktail Time; unique dials. Official list ¥60,500–85,800"},
 {brand:"Seiko",line:"5 Sports SBSA series",effective_inr_min:22000,effective_inr_max:28000,link:"https://www.seikowatches.com/jp-ja/products/5sports",link_verified:true,notes:"Japan-exclusive colours. Official list ¥42,900–62,700"},
 {brand:"Seiko",line:"Selection / Spirit",effective_inr_min:9000,effective_inr_max:25000,link:"https://www.seikowatches.com/jp-ja/products/seikoselection",link_verified:true,notes:"solar radio-controlled quartz; great value"},
 {brand:"Seiko",line:"Lukia",effective_inr_min:23000,effective_inr_max:45000,link:"https://www.seikowatches.com/jp-ja/products/lukia",link_verified:true,notes:"women's line; good gift. Current models list at ¥63,800–141,900, so the cheap end is older stock"},
 {brand:"Citizen",line:"Attesa",effective_inr_min:32000,effective_inr_max:48000,link:"https://citizen.jp/attesa/index.html",link_verified:true,notes:"titanium solar radio-controlled; standout pick"},
 {brand:"Citizen",line:"xC",effective_inr_min:23000,effective_inr_max:45000,link:"https://citizen.jp/xc/index.html",link_verified:true,notes:"women's equivalent of Attesa"},
 {brand:"Casio",line:"Lineage",effective_inr_min:12000,effective_inr_max:25000,link:"https://www.casio.com/jp/watches/casio/product.LCW-M170D-1A/",link_verified:true,notes:"slim titanium solar. Link is one example, LCW-M170D-1AJF"},
 {brand:"Casio",line:"Wave Ceptor",effective_inr_min:6000,effective_inr_max:12000,link:null,link_verified:false,notes:"cheapest solar radio-controlled"},
 {brand:"Casio",line:"Oceanus Classic Line",effective_inr_min:32000,effective_inr_max:48000,link:"https://www.casio.com/jp/watches/oceanus/collection/",link_verified:true,notes:"premium titanium"},
 {brand:"Casio",line:"G-Shock Japan-limited (JF/JR suffix)",effective_inr_min:9000,effective_inr_max:25000,link:null,link_verified:false,notes:"limited editions and collabs"}
];
var JAPAN_ONLY_RATE = 0.63;

/* Above the ₹50k budget. "stretch" may still fit inside one person's ₹75,000
   duty-free allowance; "browse" is for looking. jp_min_jpy / jp_max_jpy are
   official list prices, tax included, where one was found — discount shops are
   often lower. india_note is the official India price, where there is one. */
var ABOVE_BUDGET = [
 {tier:"stretch",brand:"Orient",line:"Orient Star Classic, Diver and M34",jp_min_jpy:90200,jp_max_jpy:101200,link:"https://orient-watch.com/ja/orientstar/collection/classic/",link_verified:true,notes:"in-house automatic with power reserve; rarely seen in India. Classic from ¥90,200, Diver ¥101,200"},
 {tier:"stretch",brand:"Seiko",line:"Prospex Alpinist (current SPB)",jp_min_jpy:null,jp_max_jpy:null,link:"https://www.seikowatches.com/in-en/products/prospex/special/alpinist",link_verified:true,india_note:"₹90,000 (SPB503/505/507)",notes:"the step up from the ₹45–50k Alpinist row; check the shelf price"},
 {tier:"stretch",brand:"Seiko",line:"Presage Sharp Edged (SPB)",jp_min_jpy:null,jp_max_jpy:null,link:"https://www.seikowatches.com/in-en/products/presage/sharpedged",link_verified:true,india_note:"₹89,000–1,61,000",notes:"Japan discount shops often have it well under the India price"},
 {tier:"stretch",brand:"Seiko",line:"Presage Style60s (SSA)",jp_min_jpy:null,jp_max_jpy:null,link:"https://www.seikowatches.com/in-en/products/presage/style60s",link_verified:true,india_note:"₹60,000–67,000",notes:"the open-heart and power-reserve versions"},
 {tier:"browse",brand:"Seiko",line:"Presage Craftsmanship (enamel, Urushi, Arita dials)",link:"https://www.seikowatches.com/in-en/products/presage/classic",link_verified:true,india_note:"₹95,000–1,95,500",notes:"the dial is the point; Japan has colours India never gets"},
 {tier:"browse",brand:"Citizen",line:"Series 8",link:"https://www.citizenwatches.co.in/products/series-8",link_verified:true,notes:"anti-magnetic automatic, modern design"},
 {tier:"browse",brand:"Casio",line:"Oceanus Manta",link:"https://www.casio.com/jp/watches/oceanus/collection/manta/",link_verified:true,notes:"slim titanium solar radio-controlled; Japan-only for most references"},
 {tier:"browse",brand:"Citizen",line:"Exceed",jp_min_jpy:165000,jp_max_jpy:null,link:"https://citizen.jp/exceed/index.html",link_verified:true,notes:"Japan-only, 7mm titanium solar radio-controlled"},
 {tier:"browse",brand:"Citizen",line:"Attesa GPS chronograph",jp_min_jpy:297000,jp_max_jpy:null,link:"https://citizen.jp/attesa/index.html",link_verified:true,notes:"the top of the Attesa range"},
 {tier:"browse",brand:"Citizen",line:"The Citizen",link:"https://citizen.jp/the-citizen/index.html",link_verified:true,notes:"±1 second a year quartz; a quiet grail"},
 {tier:"browse",brand:"Seiko",line:"King Seiko",link:"https://www.seikowatches.com/in-en/products/kingseiko",link_verified:true,india_note:"₹3,10,000–3,50,000",notes:"Ginza boutique"},
 {tier:"browse",brand:"Seiko",line:"Grand Seiko",link:"https://www.grand-seiko.com/in-en",link_verified:true,notes:"the Ginza flagship is worth the visit even just to look"},
 {tier:"browse",brand:"Seiko",line:"Credor",link:"https://www.credor.com/en/",link_verified:true,notes:"Seiko's dress-watch house"},
 {tier:"browse",brand:"Seiko",line:"Brightz",link:null,link_verified:false,notes:"Japan-only titanium; no longer listed on Seiko Japan, so look for remaining stock"},
 {tier:"browse",brand:"Casio",line:"G-Shock MR-G",link:null,link_verified:false,notes:"hand-finished titanium G-Shock; flagship stores in Ginza and Shibuya"}
];

/* ---------- the maths ---------- */
function rateWithMarkup(rate, cfg) {
  return rate * (1 + (cfg.card_markup_pct || 0) / 100);
}

/* What you pay in rupees after the refund. The tag already includes tax, so the
   refund is tax/(100+tax) of it — 10/110, not 10%. The ¥5,000 minimum is
   checked on the tax-excluded price. */
function refundApplies(tagJpy, cfg) {
  return tagJpy / (1 + cfg.tax_refund_pct / 100) >= cfg.tax_refund_min_jpy;
}
/* noRefund: bought online (Apple refurbished, web shops) — no tax-free at all */
function effectiveInr(tagJpy, rate, cfg, noRefund) {
  var jpy = !noRefund && refundApplies(tagJpy, cfg) ? tagJpy / (1 + cfg.tax_refund_pct / 100) : tagJpy;
  return jpy * rateWithMarkup(rate, cfg);
}

function savingPct(jpInr, indiaInr) {
  if (indiaInr == null || !(indiaInr > 0)) return null;
  return Math.round((indiaInr - jpInr) / indiaInr * 100);
}

/* "25-30k" style band for a rupee figure */
function bandOf(inr, cfg) {
  var lo = Math.floor(inr / cfg.band_inr) * cfg.band_inr;
  return lo / 1000 + "-" + (lo + cfg.band_inr) / 1000 + "k";
}

function movementKind(m) {
  if (/automatic/.test(m)) return "automatic";
  if (/solar/.test(m)) return "solar";
  return "quartz";
}

/* A watch with its rupee figures filled in for this rate */
/* A shop product with its rupee figures filled in for this rate */
function pricedProduct(p, rate, cfg) {
  var o = {};
  for (var k in p) o[k] = p[k];
  o.refund = p.jp_tag_jpy && !p.no_refund ? refundApplies(p.jp_tag_jpy, cfg) : false;
  o.jp_effective_inr = p.jp_tag_jpy ? Math.round(effectiveInr(p.jp_tag_jpy, rate, cfg, p.no_refund)) : null;
  o.saving_pct = o.jp_effective_inr == null ? null : savingPct(o.jp_effective_inr, p.india_inr);
  return o;
}

function priced(w, rate, cfg) {
  var o = {};
  for (var k in w) o[k] = w[k];
  o.refund = refundApplies(w.jp_tag_jpy, cfg);
  o.jp_effective_inr = Math.round(effectiveInr(w.jp_tag_jpy, rate, cfg));
  o.saving_pct = savingPct(o.jp_effective_inr, w.india_inr);
  o.live_band = bandOf(o.jp_effective_inr, cfg);
  o.movement_kind = movementKind(w.movement);
  return o;
}

/* Other things cheaper in Japan. Savings are rough ranges against Indian retail;
   null where it's about what you can't get at home rather than price.
   counts_toward_allowance is false only for the laptop, which has its own
   exemption — and only for one. */
var SHOP_ITEMS = [
 {id:"knives",tab:"Knives",category:"Japanese knives",examples:"Tojiro, Global, Shun, Kai",saving_pct_min:40,saving_pct_max:60,where_to_buy:"Kappabashi (Tokyo); Aritsugu, Nishiki Market (Kyoto); department stores",catch:"Must go in checked baggage",counts_toward_allowance:true,is_laptop:false,link:"https://www.kappabashi.or.jp/en/",link_verified:true},
 {id:"muji",tab:"Muji",category:"Muji",examples:"stationery, travel pouches, clothing",saving_pct_min:30,saving_pct_max:50,where_to_buy:"Muji stores",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://www.muji.com/jp/ja/store/cmdty/section-top/home",link_verified:true},
 {id:"onitsuka",tab:"Shoes",category:"Onitsuka Tiger / Asics",examples:"sneakers",saving_pct_min:25,saving_pct_max:40,where_to_buy:"brand stores; department stores",catch:"Japan-only models sell out",counts_toward_allowance:true,is_laptop:false,link:"https://www.onitsukatiger.com/jp/ja-jp/",link_verified:true},
 {id:"uniqlo",tab:"Uniqlo",category:"Uniqlo",examples:"Heattech, Ultra Light Down",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Uniqlo stores",catch:"Small saving — once dutied above the allowance it can cost more than in India",counts_toward_allowance:true,is_laptop:false,link:"https://www.uniqlo.com/jp/ja/special-feature/tax-free",link_verified:true},
 {id:"skincare",tab:"Skincare",category:"Skincare & sunscreen",examples:"Biore, Anessa, Hada Labo, Shiseido, Curel",saving_pct_min:40,saving_pct_max:60,where_to_buy:"Matsumoto Kiyoshi; Don Quijote; drugstores",catch:"Liquids over 100 ml must go in checked baggage",counts_toward_allowance:true,is_laptop:false,link:"https://www.donki.com/en/tax_free/",link_verified:true},
 {id:"stationery",tab:"Stationery",category:"Stationery & pens",examples:"Pilot, Uni, Zebra, Sailor",saving_pct_min:40,saving_pct_max:60,where_to_buy:"Loft; Hands; Itoya (Ginza)",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://www.ito-ya.co.jp/",link_verified:true},
 {id:"cameras",tab:"Cameras",category:"Cameras & lenses",examples:"Sony, Canon, Fujifilm, Nikon",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Yodobashi Camera; Bic Camera; Map Camera",catch:"Check for English menus; warranty may be Japan-only",counts_toward_allowance:true,is_laptop:false,link:"https://www.mapcamera.com/html/worldguide/english_page.html",link_verified:true},
 {id:"audio",tab:"Audio",category:"Headphones / IEMs",examples:"Sony, Audio-Technica, Final",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Yodobashi; e-earphone (Akihabara)",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://www.e-earphone.jp/pages/shop_list",link_verified:true},
 {id:"whisky",tab:"Whisky & sake",category:"Japanese whisky & sake",examples:"Suntory Toki, Nikka, Hibiki, local sake",saving_pct_min:20,saving_pct_max:50,where_to_buy:"liquor shops; department store food halls",catch:"2 litres duty-free per adult; premium bottles are rationed",counts_toward_allowance:true,is_laptop:false,link:null,link_verified:false},
 {id:"macbook",tab:"MacBook",category:"MacBook",examples:"MacBook Neo, Air, Pro",saving_pct_min:18,saving_pct_max:22,where_to_buy:"Apple Store; Yodobashi",catch:"Store stock has a Japanese (JIS) keyboard — order an English layout online in advance",counts_toward_allowance:false,is_laptop:true,link:"https://www.apple.com/jp/retail/shinjuku/",link_verified:true},
 {id:"laptops",tab:"Laptops",category:"Windows laptops",examples:"VAIO, Panasonic Let's note, Fujitsu FMV, Surface, ThinkPad",saving_pct_min:10,saving_pct_max:20,where_to_buy:"Yodobashi Akiba; Bic Camera; VAIO Store and Lenovo Japan online (to order)",catch:"Store stock has Japanese (JIS) keyboards and Japanese Windows; warranties are mostly Japan-only",counts_toward_allowance:false,is_laptop:true,link:null,link_verified:false},
 {id:"iphone",tab:"iPhone",category:"iPhone",examples:"iPhone",saving_pct_min:10,saving_pct_max:20,where_to_buy:"Apple Store; Bic Camera",catch:"Camera shutter sound can't be turned off",counts_toward_allowance:true,is_laptop:false,link:"https://www.apple.com/jp/retail/ginza/",link_verified:true},
 {id:"switch2",tab:"Switch 2",category:"Nintendo Switch 2",examples:"console",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Yodobashi; Bic Camera",catch:"Buy only the multi-language version — the cheaper Japanese one is locked to Japanese language and accounts",counts_toward_allowance:true,is_laptop:false,link:"https://www.nintendo.com/jp/hardware/switch2/lineup/japan-only/index.html",link_verified:true},
 {id:"ps5",tab:"PS5",category:"PlayStation 5",examples:"PS5, PS5 Digital, PS5 Pro, DualSense",saving_pct_min:20,saving_pct_max:25,where_to_buy:"Yodobashi; Bic Camera; Sony Store Ginza",catch:"Japanese PS5s are rated 100 V — use a step-down transformer in India. Avoid the ¥55,000 Japanese-only model",counts_toward_allowance:true,is_laptop:false,link:"https://www.playstation.com/ja-jp/ps5/",link_verified:true},
 {id:"snacks",tab:"Snacks",category:"Snacks & gifts",examples:"matcha, KitKat flavours, Tokyo Banana, gacha toys",saving_pct_min:null,saving_pct_max:null,where_to_buy:"konbini; Don Quijote; Kyoto tea shops",catch:"Food must be declared if asked",counts_toward_allowance:true,is_laptop:false,link:null,link_verified:false},
 {id:"anime",tab:"Anime",category:"Anime figures & Gunpla",examples:"scale figures, Gundam kits, trading cards",saving_pct_min:null,saving_pct_max:null,where_to_buy:"Akihabara; Nakano Broadway",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://nakano-broadway.com/",link_verified:true},
 {id:"hundred-yen",tab:"100-yen",category:"100-yen shops",examples:"kitchen gadgets, storage, travel bits",saving_pct_min:null,saving_pct_max:null,where_to_buy:"Daiso; Seria; Can★Do",catch:"Mostly under ¥5,000 a shop, so no tax refund",counts_toward_allowance:true,is_laptop:false,link:"https://www.daiso-sangyo.co.jp/",link_verified:true},
 {id:"preowned",tab:"Pre-owned",category:"Pre-owned cameras, watches, bags",examples:"used Grand Seiko, film cameras, lenses",saving_pct_min:null,saving_pct_max:null,where_to_buy:"Komehyo Shinjuku; Map Camera; Nakano Broadway",catch:"The warranty is the shop's, not the brand's",counts_toward_allowance:true,is_laptop:false,link:"http://www.en.komehyo.co.jp/store/tokyo/shinjuku/index.html",link_verified:true}
];

/* Specific things to buy in each SHOP_ITEMS category. jp_tag_jpy is the shop
   price with tax; india_inr is the Indian retail price, null where it isn't
   sold there. Rupee cost and saving are worked out like the watches. */
var SHOP_PRODUCTS = [
 {id:"knives-tojiro-dp-gyuto-210mm-f-808",cat:"knives",name:"Tojiro DP Gyuto 210mm F-808",why:"The standard first good Japanese chef's knife: hard cobalt-alloy core, keeps an edge far longer than typical knives, and costs little.",jp_tag_jpy:14300,india_inr:null,tip:"Compare prices along Kappabashi. Knives go in checked baggage only.",link:"https://tojiro.net/",link_verified:true,jp_source:"Kakaku.com (one listing — Kappabashi shops are often cheaper)",india_source:null},
 {id:"knives-global-g-2-chef-s-knife-20cm",cat:"knives",name:"Global G-2 chef's knife 20cm",why:"Iconic one-piece stainless knife: light, hygienic, no wooden handle to rot in a humid kitchen.",jp_tag_jpy:12100,india_inr:null,tip:"Bic Camera, Yodobashi and Kappabashi all have it. Buy one knife, not a set — sets start around ¥23,000.",link:"https://www.yoshikin.co.jp/en/",link_verified:true,jp_source:"Kakaku.com",india_source:null},
 {id:"knives-kai-seki-magoroku-10000cl-sa",cat:"knives",name:"Kai Seki Magoroku 10000CL Santoku 165mm (AE5254)",why:"Good-value santoku from Seki's best-known maker; suits Indian vegetable prep and sells about 30% under list.",jp_tag_jpy:8101,india_inr:null,tip:"Bic Camera and Yodobashi kitchen floors carry the whole range — points plus tax-free.",link:null,link_verified:false,jp_source:"Bic Camera (list ¥12,000; Yodobashi ¥8,330)",india_source:null},
 {id:"knives-kai-seki-magoroku-damascus-s",cat:"knives",name:"Kai Seki Magoroku Damascus Santoku 165mm (AE5200)",why:"Damascus-pattern blade at a mid price — a gift knife that looks premium.",jp_tag_jpy:10680,india_inr:null,tip:"For hand-forged with free name engraving, Aritsugu in Nishiki Market, Kyoto. Go early.",link:null,link_verified:false,jp_source:"Bic Camera (list ¥15,000)",india_source:null},
 {id:"knives-king-kw-65-whetstone-1000-60",cat:"knives",name:"King KW-65 whetstone #1000/#6000 with base",why:"The classic beginner two-grit waterstone to keep a Japanese knife sharp.",jp_tag_jpy:2900,india_inr:null,tip:"About 1kg — checked baggage. Kappabashi knife shops and Hands stock it.",link:null,link_verified:false,jp_source:"Amazon.co.jp via Kakaku.com",india_source:null},
 {id:"muji-muji-smooth-gel-ink-pen-knoc",cat:"muji",name:"Muji smooth gel ink pen, knock type 0.5mm",why:"Minimal smooth gel pen that costs very little — good for bulk gifts.",jp_tag_jpy:120,india_inr:null,tip:"Grab refills (about ¥90). Muji Ginza has the full colour range.",link:null,link_verified:false,jp_source:"muji.com staff posts",india_source:null},
 {id:"muji-muji-ultrasonic-aroma-diffus",cat:"muji",name:"Muji ultrasonic aroma diffuser",why:"Quiet, well-designed diffuser, cheaper in Japan.",jp_tag_jpy:6990,india_inr:null,tip:"Japanese models are 100V with a Japanese plug — check the adapter says 100–240V, or just buy the oils.",link:null,link_verified:false,jp_source:"muji.com store post (Jan 2026)",india_source:null},
 {id:"muji-muji-toning-water-sensitive",liquid:"big",cat:"muji",name:"Muji Toning Water, sensitive skin high-moisture 200ml",why:"Fragrance- and alcohol-free toner that costs about double abroad.",jp_tag_jpy:690,india_inr:null,tip:"Liquid — checked baggage. The 400ml bottle and refills are better value.",link:null,link_verified:false,jp_source:"ranking.net (official price)",india_source:null},
 {id:"muji-muji-hanging-toiletry-case",cat:"muji",name:"Muji hanging toiletry case",why:"Hanging travel organiser that unzips flat — a frequent-traveller staple.",jp_tag_jpy:1790,india_inr:null,tip:"Buy it early and use it for the rest of the trip.",link:null,link_verified:false,jp_source:"muji.com store post (Jul 2026)",india_source:null},
 {id:"onitsuka-onitsuka-tiger-mexico-66",cat:"onitsuka",name:"Onitsuka Tiger Mexico 66",why:"The signature Onitsuka shoe — ¥16,500 here against ₹12,500+ in India.",jp_tag_jpy:16500,india_inr:12500,tip:"Sizes are in cm and it runs narrow — try half a size up. Ginza, Omotesando and Shinsaibashi flagships sell out popular sizes; go at opening.",link:"https://www.onitsukatiger.com/jp/ja-jp/product/mexico-66/1183c102_751.html",link_verified:true,jp_source:"Onitsuka Tiger Japan",india_source:"Onitsuka Tiger India (from)"},
 {id:"onitsuka-onitsuka-tiger-mexico-66-sd",cat:"onitsuka",name:"Onitsuka Tiger Mexico 66 SD VIN",why:"More cushioned, premium-built Mexico 66.",jp_tag_jpy:19800,india_inr:16500,tip:"Resellers ask ¥45,000+ — buy only at official stores.",link:"https://www.onitsukatiger.com/jp/ja-jp/product/mexico-66-sd/1183c015_202.html",link_verified:true,jp_source:"Onitsuka Tiger Japan",india_source:"Onitsuka Tiger India (from)"},
 {id:"onitsuka-mexico-66-deluxe-nippon-made",cat:"onitsuka",name:"Mexico 66 Deluxe, Nippon Made",why:"Hand-made in Japan from premium leather — the most only-in-Japan Onitsuka buy.",jp_tag_jpy:35200,india_inr:null,tip:"Mainly at the Ginza and Omotesando flagships. Men's and women's are separate SKUs.",link:"https://www.onitsukatiger.com/jp/ja-jp/product/mexico-66-deluxe/1181a370_102.html",link_verified:true,jp_source:"Onitsuka Tiger Japan",india_source:null},
 {id:"onitsuka-onitsuka-tiger-gsm-nm-nippon",cat:"onitsuka",name:"Onitsuka Tiger GSM NM, Nippon Made",why:"Japan-made retro court shoe, hard to find outside Japan.",jp_tag_jpy:40700,india_inr:null,tip:"The Colorado Eighty-Five NM is the cheaper Japan-made option at ¥35,200.",link:"https://www.onitsukatiger.com/jp/ja-jp/product/gsm-nm/1183c471_200.html",link_verified:true,jp_source:"Onitsuka Tiger Japan",india_source:null},
 {id:"onitsuka-asics-gel-kayano-14",cat:"onitsuka",name:"Asics Gel-Kayano 14",why:"The popular Y2K-runner sneaker, with more colourways in Japan.",jp_tag_jpy:19800,india_inr:null,tip:"Asics Harajuku flagship, atmos and Billy's for Japan-only colourways.",link:null,link_verified:false,jp_source:"Asics official price via ITmedia",india_source:null},
 {id:"onitsuka-asics-gel-1130",cat:"onitsuka",name:"Asics Gel-1130",why:"Cheaper retro runner, easy to wear every day.",jp_tag_jpy:14300,india_inr:null,tip:"ABC-Mart and Asics stores have it. Sizing differs from Onitsuka — try on.",link:null,link_verified:false,jp_source:"ZOZOTOWN",india_source:null},
 {id:"uniqlo-heattech-crew-neck-long-slee",cat:"uniqlo",name:"Heattech crew neck, long sleeve",why:"The thermal layer for late-November Tokyo — same number in yen as rupees, so about 40% cheaper.",jp_tag_jpy:1290,india_inr:1290,tip:"Buy 2–3 on day one. Uniqlo Ginza (12 floors) has every size.",link:"https://www.uniqlo.com/jp/ja/products/E461001-000",link_verified:true,jp_source:"Uniqlo Japan",india_source:"Uniqlo India"},
 {id:"uniqlo-heattech-extra-warm-cashmere",cat:"uniqlo",name:"Heattech Extra Warm cashmere-blend crew",why:"About 1.5× as warm as regular Heattech; small saving.",jp_tag_jpy:2490,india_inr:1990,tip:"Watch for yellow 期間限定価格 tags — often ¥500 off at weekends.",link:"https://www.uniqlo.com/jp/ja/products/E469765-000",link_verified:true,jp_source:"Uniqlo Japan",india_source:"Uniqlo India"},
 {id:"uniqlo-heattech-ultra-warm-crew",cat:"uniqlo",name:"Heattech Ultra Warm crew",why:"About 2.25× as warm — for night-time Kyoto if you run cold.",jp_tag_jpy:2990,india_inr:2490,tip:"Probably too warm indoors in November.",link:"https://www.uniqlo.com/jp/ja/products/E478965-000",link_verified:true,jp_source:"Uniqlo Japan",india_source:"Uniqlo India"},
 {id:"uniqlo-ultra-light-down-jacket",cat:"uniqlo",name:"Ultra Light Down jacket",why:"Packs into its own pouch; not on Uniqlo India, so effectively Japan-only for you.",jp_tag_jpy:7990,india_inr:null,tip:"Japanese sizes run about one size small.",link:"https://www.uniqlo.com/jp/ja/products/E470067-000",link_verified:true,jp_source:"Uniqlo Japan",india_source:null},
 {id:"uniqlo-pufftech-jacket",cat:"uniqlo",name:"Pufftech jacket",why:"Synthetic puffer that copes with rain and machine-washes.",jp_tag_jpy:6990,india_inr:5990,tip:"Some colours are on promo at ¥5,990 — check the rack.",link:"https://www.uniqlo.com/jp/ja/products/E487408-000",link_verified:true,jp_source:"Uniqlo Japan",india_source:"Uniqlo India"},
 {id:"uniqlo-airism-cotton-oversized-tee",cat:"uniqlo",name:"AIRism Cotton oversized tee",why:"Good everyday tee for Delhi — but only worth it on promo.",jp_tag_jpy:1990,india_inr:1490,tip:"Buy only at the ¥990 promo price; at ¥1,990 it's India's price.",link:"https://www.uniqlo.com/jp/ja/products/E465185-000",link_verified:true,jp_source:"Uniqlo Japan",india_source:"Uniqlo India"},
 {id:"skincare-biore-uv-aqua-rich-watery-es",liquid:"small",cat:"skincare",name:"Biore UV Aqua Rich Watery Essence SPF50+ 70g",why:"Japan's best-selling light gel sunscreen (2025 formula), about half the Indian import price.",jp_tag_jpy:968,india_inr:1270,tip:"Kao has warned about fakes — buy from a real drugstore. JAN 4901301447647 is the 2025 version.",link:"https://www.kao.co.jp/bioreuv/",link_verified:true,jp_source:"Matsumoto Kiyoshi online",india_source:"Tira Beauty"},
 {id:"skincare-anessa-perfect-uv-skincare-m",liquid:"small",cat:"skincare",name:"Anessa Perfect UV Skincare Milk SPF50+ 60ml (gold)",why:"Shiseido's top water- and sweat-resistant sunscreen, made for heat like Delhi's.",jp_tag_jpy:3058,india_inr:null,tip:"Do all the skincare in one drugstore trip so it clears ¥5,000 for the refund.",link:"https://www.shiseido.co.jp/anessa/products/suncare/perfect_uv_sm/",link_verified:true,jp_source:"Shiseido / Matsumoto Kiyoshi",india_source:null},
 {id:"skincare-hada-labo-gokujyun-hyaluroni",liquid:"big",cat:"skincare",name:"Hada Labo Gokujyun hyaluronic lotion 170ml",why:"The cult hyaluronic toner, under ¥1,000 here and import-only in India.",jp_tag_jpy:902,india_inr:null,tip:"Refill pouches (¥781) are lighter and leak less in checked bags.",link:"https://www.shop.rohto.co.jp/category/skincare/hadalabo/gokujyun/155712.html",link_verified:true,jp_source:"Rohto official / Matsumoto Kiyoshi",india_source:null},
 {id:"skincare-melano-cc-premium-vitamin-c",liquid:"small",cat:"skincare",name:"Melano CC Premium vitamin C essence 20ml",why:"Cheap vitamin C serum for dark spots, not officially sold in India.",jp_tag_jpy:1628,india_inr:null,tip:"Get the gold-box Premium, not the cheaper regular essence (¥1,210) or the Men version. Drugstores often have it for ¥1,300–1,500; imported copies in India cost several times more.",link:"https://www.shop.rohto.co.jp/category/skincare/melanocc/168583.html",link_verified:true,jp_source:"Rohto official (regular ¥1,210)",india_source:null},
 {id:"skincare-senka-perfect-whip-collagen",liquid:"big",cat:"skincare",name:"Senka Perfect Whip Collagen-in face wash 120g",why:"Dense-foam cleanser at about ¥650 — buy several as gifts.",jp_tag_jpy:658,india_inr:null,tip:"The White Clay version is the same price.",link:"https://brand.finetoday.com/jp/senka/products/perfect-whip-collagen-in/",link_verified:true,jp_source:"FineToday official",india_source:null},
 {id:"skincare-keana-rice-mask",liquid:"big",cat:"skincare",name:"Keana Nadeshiko rice mask, 10 sheets (毛穴撫子 お米のマスク)",why:"Best-selling thick Japanese sheet mask made with domestic rice serum.",jp_tag_jpy:715,india_inr:null,tip:"The limited 28-sheet box (about ¥1,760) is cheaper per sheet if you see it. What Amazon.in sells is mostly the wash-off Rice Pack — a different product.",link:"https://www.ishizawa-lab.co.jp/keana_skincare/mask.html",link_verified:true,jp_source:"Matsumoto Kiyoshi online",india_source:null},
 {id:"skincare-fino-hair-mask",liquid:"big",cat:"skincare",name:"fino Premium Touch hair mask 230g (濃厚美容液ヘアマスク)",why:"Japan's cult drugstore hair mask — salon-smooth for about ¥1,000.",jp_tag_jpy:1062,india_inr:798,tip:"The 浸透美容液 version is the older one; the current jar says 濃厚美容液. Create SD and Donki sell it for ¥770–850.",link:"https://onlineshop.finetoday.com/products/fino-05",link_verified:true,jp_source:"FineToday official (Yodobashi ¥835)",india_source:"Amazon.in import listings"},
 {id:"skincare-fino-hair-mask-refill",liquid:"big",cat:"skincare",name:"fino Premium Touch hair mask refill 700g (つめかえ用)",why:"About 3× the jar for 2.3× the price.",jp_tag_jpy:2398,india_inr:null,tip:"There's no 230g refill — buy one jar and one 700g pouch, and refill the jar at home. Heavy.",link:"https://onlineshop.finetoday.com/products/fino-01",link_verified:true,jp_source:"FineToday official (Yodobashi ¥2,340)",india_source:null},
 {id:"skincare-tsubaki-repair-mask",liquid:"big",cat:"skincare",name:"TSUBAKI Premium EX Repair Mask 180g (プレミアムEXリペアマスク)",why:"Camellia-oil repair mask you rinse off straight away — fino's main rival.",jp_tag_jpy:1298,india_inr:1713,tip:"In India, avoid look-alike “T-Subaki” listings. Create SD has it for about ¥1,100.",link:"https://onlineshop.finetoday.com/products/tsubaki-18",link_verified:true,jp_source:"FineToday official",india_source:"Amazon.in import listings"},
 {id:"skincare-tsubaki-repair-mask-refill",liquid:"big",cat:"skincare",name:"TSUBAKI Premium EX Repair Mask refill 150g (つめかえ用)",why:"Cheaper pouch to top up the bottle.",jp_tag_jpy:990,india_inr:null,tip:"Holds less than the bottle (150g vs 180g), so it's only slightly cheaper per gram.",link:"https://onlineshop.finetoday.com/products/tsubaki-04",link_verified:true,jp_source:"FineToday official",india_source:null},
 {id:"skincare-pair-acne-cream",liquid:"small",cat:"skincare",name:"Lion PAIR Acne Cream W 24g (ペアアクネクリームW)",why:"Steroid-free OTC acne cream that dries clear and works under makeup; not sold in India.",jp_tag_jpy:1754,india_inr:null,tip:"A Class 2 OTC medicine — at the drugstore counter. 24g is better value than 14g (about ¥1,045).",link:"https://pair.lion.co.jp/products/cream/",link_verified:true,jp_source:"Matsumoto Kiyoshi online (Create SD ¥1,537)",india_source:null},
 {id:"skincare-vt-pro-cica-patch",cat:"skincare",name:"VT PRO CICA Clear Spot Patch, 48 (プロCICA クリアスポットパッチ)",why:"Cheap waterproof CICA pimple patches in two sizes, for under makeup or overnight.",jp_tag_jpy:650,india_inr:null,tip:"Dry patches — no liquid rules. Matsukiyo limits how many you can buy.",link:null,link_verified:false,jp_source:"Create SD online",india_source:null},
 {id:"skincare-quality-1st-sheet-mask",liquid:"big",cat:"skincare",name:"Quality 1st All-in-One Sheet Mask Moist EX II, 50 (best guess for “cospa sheet mask”)",why:"The classic value bulk mask — about ¥33 a sheet.",jp_tag_jpy:1650,india_inr:null,tip:"No brand is actually called Cospa (コスパ means value for money). If you meant another, Saborino 目ざまシート and Lululun Pure are the other big value packs.",link:null,link_verified:false,jp_source:"@cosme list price",india_source:null},
 {id:"skincare-kose-make-keep-mist",liquid:"small",cat:"skincare",name:"KOSE Make Keep Mist EX+ 80ml (メイク キープ ミスト EX＋)",why:"Japan's best-selling makeup setting spray — waterproof, stops transfer onto masks.",jp_tag_jpy:1320,india_inr:null,tip:"The old EX is now EX+. Drugstores are often 10–20% under the official price. A 35ml size also exists.",link:"https://maison.kose.co.jp/site/makekeepmist/g/gDLEA/",link_verified:true,jp_source:"Maison KOSÉ official",india_source:null},
 {id:"skincare-nameraka-eye-cream",liquid:"small",cat:"skincare",name:"Nameraka Honpo Medicated Wrinkle Eye Cream White 20g (薬用リンクルアイクリーム ホワイト)",why:"Soy-milk eye cream with niacinamide and retinol — the closest Nameraka Honpo has to a dark-circle cream.",jp_tag_jpy:1100,india_inr:null,tip:"Nameraka has no cream officially for dark circles (クマ); this one brightens and treats fine lines.",link:null,link_verified:false,jp_source:"@cosme list price (Create SD ¥1,097)",india_source:null},
 {id:"skincare-naturie-hatomugi-gel",liquid:"big",cat:"skincare",name:"Naturie Hatomugi skin conditioning gel 180g (ハトムギ保湿ジェル)",why:"Cult light, non-sticky moisturising gel — suits Delhi humidity.",jp_tag_jpy:990,india_inr:null,tip:"Tsuruha and Donki often go under ¥800. The matching Hatomugi lotion 500ml (about ¥748) is the usual pair.",link:"https://www.imju.jp/shop/g/g4903335695551/",link_verified:true,jp_source:"imju official (Tsuruha ¥778)",india_source:null},
 {id:"stationery-pilot-kakuno-fountain-pen-fk",cat:"stationery",name:"Pilot Kakuno fountain pen (FKA-1SR)",why:"The best cheap starter fountain pen; Japanese F/EF nibs write finer than European ones.",jp_tag_jpy:748,india_inr:null,tip:"Grab a 12-pack of IRF-12S cartridges (about ¥322). Loft and Itoya have testers.",link:null,link_verified:false,jp_source:"Kakaku.com",india_source:null},
 {id:"stationery-pilot-custom-74-14k-nib-fkkn",cat:"stationery",name:"Pilot Custom 74, 14k nib (FKKN-12SR)",why:"Classic gold-nib pen with converter; more nib sizes in Japan and cheaper than imported.",jp_tag_jpy:19567,india_inr:null,tip:"Try nibs at Itoya Ginza or Maruzen first.",link:null,link_verified:false,jp_source:"Kakaku.com (varies by colour and seller)",india_source:null},
 {id:"stationery-uni-kuru-toga-ks-mechanical",cat:"stationery",name:"uni Kuru Toga KS mechanical pencil 0.5mm (M5-KS)",why:"Rotating lead keeps the point sharp; newest models and colours land in Japan first.",jp_tag_jpy:605,india_inr:null,tip:"Loft and Hands carry the full lineup including Dive and Metal. Add uni Nano Dia leads.",link:"https://www.mpuni.co.jp/products/mechanical_pencils/kurutoga/",link_verified:true,jp_source:"Kakaku.com",india_source:null},
 {id:"stationery-zebra-mildliner-5-colour-set",cat:"stationery",name:"Zebra Mildliner 5-colour set (WKT7-5C)",why:"Soft pastel dual-tip highlighters loved for journaling; Japanese sets are cheap.",jp_tag_jpy:660,india_inr:null,tip:"Japan-only colour sets are on the Loft and Hands pen walls.",link:"https://www.zebra.co.jp/pro/detail/mildliner/",link_verified:true,jp_source:"Zebra official (¥132 a pen)",india_source:null},
 {id:"stationery-zebra-sarasa-clip-0-5mm-gel",cat:"stationery",name:"Zebra Sarasa Clip 0.5mm gel pens, 5-pack",why:"Smooth quick-dry gel ink at about ¥100 a pen, in dozens of colours.",jp_tag_jpy:437,india_inr:null,tip:"Drugstores and konbini sell them cheaply — no need to hunt.",link:null,link_verified:false,jp_source:"Tsuruha drugstore online",india_source:null},
 {id:"stationery-hobonichi-techo-2027-a6-orig",cat:"stationery",name:"Hobonichi Techo 2027 (A6 Original / A5 Cousin)",why:"Cult day-per-page planner on Tomoe River paper; every cover and Japan-only edition is here.",jp_tag_jpy:null,india_inr:null,tip:"Loft, or Hobonichi's own TOBICHI shops in Tokyo and Kyoto. Popular covers may be gone by late November.",link:"https://www.1101.com/store/techo/en/",link_verified:true,jp_source:null,india_source:null},
 {id:"cameras-sony-7c-ii-body",cat:"cameras",name:"Sony α7C II body",why:"Small full-frame body and the biggest saving here.",jp_tag_jpy:213999,india_inr:214990,tip:"Japan-market Sony: Japanese/English menus, Japan-only warranty.",link:"https://www.sony.jp/ichigan/products/ILCE-7CM2/",link_verified:true,jp_source:"Kakaku.com",india_source:"Sony India price via MySmartPrice"},
 {id:"cameras-sony-zv-e10-ii-body",cat:"cameras",name:"Sony ZV-E10 II body",why:"Popular APS-C vlogging and travel body.",jp_tag_jpy:104223,india_inr:75990,tip:"Power-zoom kit is about ¥119,000. Set the menu to English in the shop before you pay.",link:"https://www.sony.jp/ichigan/products/ZV-E10M2/",link_verified:true,jp_source:"Kakaku.com",india_source:"Amazon.in via Smartprix"},
 {id:"cameras-fujifilm-x100vi-japanese-eng",cat:"cameras",name:"Fujifilm X100VI (Japanese/English model)",why:"Scarce in India; Japan has stock of the Japanese/English-menu version.",jp_tag_jpy:287800,india_inr:166999,tip:"Fujifilm Japan units have only Japanese and English menus since Jan 2025 — fine for you.",link:null,link_verified:false,jp_source:"Kakaku.com",india_source:"launch price (little real stock)"},
 {id:"cameras-ricoh-gr-iv",cat:"cameras",name:"Ricoh GR IV",why:"The pocket street-photo compact; Yodobashi and Bic stock it.",jp_tag_jpy:226800,india_inr:137749,tip:"Check English menus on the demo unit. Saving over India is small.",link:"https://www.ricoh-imaging.co.jp/japan/products/gr-4/",link_verified:true,jp_source:"Kakaku.com",india_source:"Amazon.in via Smartprix"},
 {id:"cameras-sigma-18-50mm-f2-8-dc-dn-con",cat:"cameras",name:"Sigma 18-50mm F2.8 DC DN Contemporary",why:"Best-value small f/2.8 zoom for APS-C, cheaper in Sigma's home market.",jp_tag_jpy:63369,india_inr:null,tip:"Lenses have no menu or region issues. Check the mount on the box.",link:"https://www.sigma-global.com/jp/lenses/c021_18_50_28/",link_verified:true,jp_source:"Kakaku.com (Sony E; Fuji X ¥60,000)",india_source:null},
 {id:"audio-sony-wh-1000xm6",cat:"audio",name:"Sony WH-1000XM6",why:"Flagship noise-cancelling headphones.",jp_tag_jpy:50634,india_inr:39990,tip:"Japan-only warranty. Change voice-guidance language in the Sony Sound Connect app.",link:"https://www.sony.jp/headphone/products/WH-1000XM6/",link_verified:true,jp_source:"Kakaku.com",india_source:"Sony India launch price"},
 {id:"audio-sony-wf-1000xm6",cat:"audio",name:"Sony WF-1000XM6",why:"Current flagship noise-cancelling earbuds.",jp_tag_jpy:36299,india_inr:29990,tip:"Japan-only warranty. The older XM5 is about ¥23,500.",link:"https://www.sony.jp/headphone/products/WF-1000XM6/",link_verified:true,jp_source:"Kakaku.com (Bic/Yodobashi ¥39,600)",india_source:"India launch, Aug 2026"},
 {id:"audio-audio-technica-ath-m50xbt2",cat:"audio",name:"Audio-Technica ATH-M50xBT2",why:"Wireless version of the classic studio monitor.",jp_tag_jpy:24810,india_inr:18490,tip:"Skip the wired ATH-M50x — it's often cheaper in India.",link:"https://www.audio-technica.co.jp/product/ATH-M50xBT2",link_verified:true,jp_source:"Kakaku.com",india_source:"Headphone Zone"},
 {id:"audio-final-e3000",cat:"audio",name:"final E3000",why:"Well-reviewed budget Japanese IEM.",jp_tag_jpy:3755,india_inr:3999,tip:"Under ¥5,000 — no refund on its own. E3000C adds a mic. Try at e-earphone.",link:null,link_verified:false,jp_source:"Kakaku.com",india_source:"Headphone Zone"},
 {id:"audio-final-e5000",cat:"audio",name:"final E5000",why:"Final's upper-tier stainless IEM, easy to audition in Akihabara.",jp_tag_jpy:34800,india_inr:null,tip:"Wants a decent DAC. e-earphone lets you test with your own phone.",link:null,link_verified:false,jp_source:"Kakaku.com",india_source:null},
 {id:"whisky-suntory-toki-700ml",liquid:"big",cat:"whisky",name:"Suntory Toki 700ml",why:"Easy highball whisky, widely available.",jp_tag_jpy:3702,india_inr:3960,tip:"Barely cheaper than India — spend your 2 litres on bottles India doesn't stock.",link:null,link_verified:false,jp_source:"Kakaku.com",india_source:"Curly Tales (Delhi-NCR)"},
 {id:"whisky-suntory-kakubin-700ml",liquid:"big",cat:"whisky",name:"Suntory Kakubin 700ml",why:"The yellow-label highball whisky in every Japanese bar; not sold in India.",jp_tag_jpy:2101,india_inr:null,tip:"Every konbini has it — no need to hunt.",link:null,link_verified:false,jp_source:"Suntory price release",india_source:null},
 {id:"whisky-nikka-from-the-barrel-500ml",liquid:"big",cat:"whisky",name:"Nikka From the Barrel 500ml",why:"High-strength blend that's cheap in Japan, rare and pricey abroad.",jp_tag_jpy:3520,india_inr:null,tip:"Often one per customer. Try Bic, Yodobashi or Kawachi liquor floors; skip marked-up Amazon listings.",link:"https://www.nikka.com/products/blended/fromthebarrel/index.html",link_verified:true,jp_source:"maker's suggested price",india_source:null},
 {id:"whisky-nikka-coffey-grain-700ml",liquid:"big",cat:"whisky",name:"Nikka Coffey Grain 700ml",why:"Sweet, vanilla-led grain whisky that's hard to find in India.",jp_tag_jpy:5940,india_inr:null,tip:"Supply is patchy — buy it when you see it at list price.",link:"https://www.nikka.com/products/grain/coffeygrain/",link_verified:true,jp_source:"Kakaku.com",india_source:null},
 {id:"whisky-suntory-hibiki-japanese-harm",liquid:"big",cat:"whisky",name:"Suntory Hibiki Japanese Harmony 700ml",why:"The premium gift bottle, cheaper than in Delhi.",jp_tag_jpy:8800,india_inr:11490,tip:"Rationed and often behind the counter — buy on sight, early in the trip.",link:"https://www.suntory.co.jp/whisky/hibiki/portfolio/japaneseharmony/",link_verified:true,jp_source:"Suntory official (from 1 Apr 2026)",india_source:"Curly Tales (Delhi-NCR)"},
 {id:"whisky-dassai-45-junmai-daiginjo-72",liquid:"big",cat:"whisky",name:"Dassai 45 Junmai Daiginjo 720ml",why:"Elegant, approachable sake at the source price.",jp_tag_jpy:2475,india_inr:null,tip:"Keep it cool and drink within months. It counts in your 2 litres.",link:"https://dassai.com/us/product/main/45.html",link_verified:true,jp_source:"Yahoo! Shopping via Saketime",india_source:null},
 {id:"macbook-neo-refurbished",no_refund:true,cat:"macbook",name:"MacBook Neo, Apple Certified Refurbished (8GB/256GB)",why:"The cheapest way to a Mac — India has no Apple refurbished store.",jp_tag_jpy:102800,india_inr:79900,tip:"Online only, so no tax refund — still about ₹18,000 under the new India price. New battery and shell, Apple's 1-year warranty. Order about two weeks ahead for delivery to your Tokyo stay.",link:"https://www.apple.com/jp/shop/refurbished/mac",link_verified:true,jp_source:"Apple Japan refurbished store",india_source:"Apple India, new"},
 {id:"macbook-neo",cat:"macbook",name:"MacBook Neo 13\" (A18 Pro, 8GB/256GB)",why:"Apple's cheapest laptop — about ₹14,500 under the India price after the refund.",jp_tag_jpy:119800,india_inr:79900,tip:"Buy in a shop with your passport (Apple Ginza, Shibuya, Marunouchi, Bic, Yodobashi) — online orders get no refund. JIS keyboard in stores; macOS switches to English in one click. Apple's warranty works in India. Amazon.in's festive sale had it near ₹65k, so check before you fly.",link:"https://www.apple.com/jp/macbook-neo/",link_verified:true,jp_source:"Apple Japan (raised 25 Jun 2026)",india_source:"Apple India"},
 {id:"macbook-macbook-air-13-m5-16gb-512gb",cat:"macbook",name:"MacBook Air 13\" M5, 16GB/512GB",why:"The base current Air.",jp_tag_jpy:224800,india_inr:149900,tip:"Shop stock has a JIS keyboard. A US keyboard is build-to-order online — order before you fly.",link:"https://www.apple.com/jp/macbook-air/",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"macbook-macbook-air-15-m5-16gb-512gb",cat:"macbook",name:"MacBook Air 15\" M5, 16GB/512GB",why:"Bigger-screen Air.",jp_tag_jpy:264800,india_inr:179900,tip:"JIS keyboard in stores. Apple's warranty is international; AppleCare+ bought in Japan is Japan-based.",link:"https://www.apple.com/jp/macbook-air/",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"macbook-macbook-pro-14-m5-16gb-1tb",cat:"macbook",name:"MacBook Pro 14\" M5, 16GB/1TB",why:"Entry MacBook Pro.",jp_tag_jpy:339800,india_inr:239900,tip:"JIS keyboard in stores; order US layout early. Keep receipt and passport for the refund.",link:"https://www.apple.com/jp/macbook-pro/",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"macbook-macbook-pro-14-m5-pro-24gb-1",cat:"macbook",name:"MacBook Pro 14\" M5 Pro, 24GB/1TB",why:"For heavier creative work.",jp_tag_jpy:429800,india_inr:299900,tip:"One laptop each is duty-free on top of ₹75k — a second one counts against it.",link:"https://www.apple.com/jp/macbook-pro/",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"laptops-surface-laptop-13",cat:"laptops",name:"Surface Laptop 13\" (1st Ed.), Snapdragon X Plus, 16GB/512GB",why:"About ₹11,500 under India after the refund, and Japan units include Office Home & Business 2024.",jp_tag_jpy:156640,india_inr:96990,tip:"Clearance stock now the 2nd Edition is out. JIS keyboard; add English under Settings › Time & language; check the Office licence works with an English account. Japan-only warranty.",link:"https://www.microsoft.com/ja-jp/store/configure/surface-laptop-13-inch/8mzbmmcjzqv3",link_verified:true,jp_source:"Yodobashi (plus 10% points)",india_source:"Reliance Digital"},
 {id:"laptops-yoga-slim-7x",no_refund:true,cat:"laptops",name:"Lenovo Yoga Slim 7x (Snapdragon X Elite, 32GB/1TB, 14.5\" OLED)",why:"Flagship 32GB/1TB OLED spec for under ₹1 lakh; India launched it at ₹1,50,990 and stock has dried up.",jp_tag_jpy:160799,india_inr:null,tip:"A 2024 model mostly sold by web shops (no refund) — ask Bic or Yodobashi for a tax-free price in store. JIS keyboard, Japan-only warranty, and ARM Windows can't run some games.",link:null,link_verified:false,jp_source:"Kakaku.com (web shops)",india_source:null},
 {id:"laptops-surface-laptop-8",cat:"laptops",name:"Microsoft Surface Laptop 8, 13.8\" Snapdragon X2 Plus, 16GB/512GB",why:"The clearest saving among Windows laptops — the same config is ₹1,93,990 in India.",jp_tag_jpy:294100,india_inr:193990,tip:"JIS keyboard at retail, no English option. It's ARM (Snapdragon), so check your apps run on it. Check Indian Surface service covers a Japan unit before buying.",link:null,link_verified:false,jp_source:"K's Denki online (Microsoft Store Japan from ¥291,280)",india_source:"Amazon.in"},
 {id:"laptops-vaio-sx14-r",cat:"laptops",name:"VAIO SX14-R (2026), Core Ultra 5 / 16GB / 256GB, 958g",why:"Japanese-made sub-1kg 14-inch, and one of the few Japan brands that sells a US keyboard to order.",jp_tag_jpy:269500,india_inr:null,tip:"Order the US keyboard on store.vaio.com weeks ahead for delivery to your Tokyo stay — store stock has kana keys. Japan-only warranty. Prices were revised in September, so recheck.",link:"https://store.vaio.com/shop/pages/sx14r2.aspx",link_verified:true,jp_source:"VAIO Store build-to-order starting price",india_source:null},
 {id:"laptops-lets-note-sc7",cat:"laptops",name:"Panasonic Let's note SC7 (2026), Core Ultra 5 / 16GB / 512GB, 0.95kg",why:"Japan-only and nearly indestructible — drop-tested, huge battery, full-size ports. Not sold in India.",jp_tag_jpy:298100,india_inr:null,tip:"Japanese keyboard only, as far as can be found. Buy it for durability and battery, not to save money. Japan-only warranty.",link:null,link_verified:false,jp_source:"Kakaku.com (Panasonic Store Plus)",india_source:null},
 {id:"laptops-fmv-note-u",cat:"laptops",name:"Fujitsu FMV Note U U59-L2 (2026), Core Ultra 5, 908g",why:"Replaces the LIFEBOOK UH — a very light Japan-only 14-inch with a backlit keyboard.",jp_tag_jpy:252780,india_inr:null,tip:"JIS keyboard; check fmv.com for an English layout on custom WEB MART models. Japan-only warranty.",link:null,link_verified:false,jp_source:"Tsukumo online",india_source:null},
 {id:"laptops-thinkpad-x1-carbon",cat:"laptops",name:"Lenovo ThinkPad X1 Carbon Gen 14 (Lenovo Japan direct)",why:"Lenovo Japan offers a US keyboard to order and runs deep sales — only worth it if one's on.",jp_tag_jpy:null,india_inr:null,tip:"A September sale had it at ¥377,960 (42% off). Choose the US keyboard and international warranty when ordering, and compare with India on the day.",link:null,link_verified:false,jp_source:null,india_source:null},
 {id:"laptops-skip-midrange",cat:"laptops",name:"Skip: mid-range Windows and gaming laptops",why:"Zenbook, Vivobook, NEC, Dynabook, Lenovo LOQ and ASUS TUF are as cheap or cheaper in India — with an Indian keyboard and warranty.",jp_tag_jpy:null,india_inr:null,tip:"Example: Zenbook 14 OLED (Core Ultra 7) is about ₹1.1–1.2 lakh here after the refund, vs ₹1,15,990 on Amazon.in with double the RAM. Macs and the Surface are the laptop wins in Japan.",link:null,link_verified:false,jp_source:null,india_source:null},
 {id:"iphone-iphone-18-pro-256gb",cat:"iphone",name:"iPhone 18 Pro, 256GB",why:"Current Pro model.",jp_tag_jpy:219800,india_inr:164900,tip:"SIM-free, but the shutter sound can't be muted. Japan units are reportedly eSIM-only — check your carrier.",link:"https://www.apple.com/jp/shop/buy-iphone/iphone-18-pro",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"iphone-iphone-18-pro-max-256gb",cat:"iphone",name:"iPhone 18 Pro Max, 256GB",why:"Current large Pro model.",jp_tag_jpy:239800,india_inr:179900,tip:"Forced shutter sound. Apple warranty works in India.",link:"https://www.apple.com/jp/shop/buy-iphone/iphone-18-pro",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"iphone-iphone-air-256gb",cat:"iphone",name:"iPhone Air, 256GB",why:"The ultra-thin model.",jp_tag_jpy:189800,india_inr:149900,tip:"eSIM-only — make sure Jio, Airtel or Vi can move your number to eSIM.",link:"https://www.apple.com/jp/shop/buy-iphone/iphone-air",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"iphone-iphone-17-256gb",cat:"iphone",name:"iPhone 17, 256GB",why:"Current base iPhone; the smallest saving.",jp_tag_jpy:159800,india_inr:99900,tip:"Indian festive offers can close the gap. Forced shutter sound.",link:"https://www.apple.com/jp/shop/buy-iphone/iphone-17",link_verified:true,jp_source:"Apple Japan",india_source:"Apple India"},
 {id:"switch2-switch-2-multi-language-mode",cat:"switch2",name:"Switch 2, multi-language model",why:"The only Japanese Switch 2 with English and non-Japan accounts; not officially sold in India.",jp_tag_jpy:69980,india_inr:null,tip:"Sold mainly via My Nintendo Store Japan, with past limits per account — walk-in stock isn't guaranteed. Grey market in India is about ₹50–65k.",link:"https://www.nintendo.com/jp/hardware/switch2/lineup/index.html",link_verified:true,jp_source:"Nintendo Japan",india_source:null},
 {id:"switch2-switch-2-japanese-only-model",cat:"switch2",name:"Switch 2, Japanese-only model — avoid",why:"Cheaper, but Japanese language and Japan accounts only.",jp_tag_jpy:59980,india_inr:null,tip:"No English system language. Game bundles are this model too.",link:"https://www.nintendo.com/jp/hardware/switch2/lineup/index.html",link_verified:true,jp_source:"Nintendo Japan (raised 25 May 2026)",india_source:null},
 {id:"switch2-switch-2-pro-controller",cat:"switch2",name:"Switch 2 Pro Controller",why:"The best accessory upgrade.",jp_tag_jpy:9980,india_inr:null,tip:"Accessories aren't region-locked.",link:"https://www.nintendo.com/jp/hardware/switch2/accessories/index.html",link_verified:true,jp_source:"Nintendo Japan",india_source:null},
 {id:"switch2-mario-kart-world-cartridge",cat:"switch2",name:"Mario Kart World (cartridge)",why:"The must-have Switch 2 game.",jp_tag_jpy:9980,india_inr:null,tip:"Switch 2 games are region-free — check the back for 英語 (English).",link:null,link_verified:false,jp_source:"4Gamer",india_source:null},
 {id:"ps5-standard",cat:"ps5",name:"PlayStation 5 with disc drive (CFI-2000)",why:"About ₹53k after the refund against ₹69,990 in India.",jp_tag_jpy:97980,india_inr:69990,tip:"Rated AC 100 V only — budget for a 230→100 V step-down transformer (500 VA or more). Make sure the box doesn't say 日本語専用. Japan-only warranty.",link:"https://www.playstation.com/ja-jp/ps5/",link_verified:true,jp_source:"Sony price from 2 Apr 2026",india_source:"Sony authorised store (ShopAtSC)"},
 {id:"ps5-digital",cat:"ps5",name:"PlayStation 5 Digital Edition (multi-language)",why:"Cheaper than India before the transformer.",jp_tag_jpy:89980,india_inr:64990,tip:"Not the ¥55,000 日本語専用 box. Same 100 V caveat. India price is as reported, not confirmed.",link:"https://www.playstation.com/ja-jp/ps5/",link_verified:true,jp_source:"Sony price from 2 Apr 2026",india_source:"reported, Jul 2026"},
 {id:"ps5-pro",cat:"ps5",name:"PlayStation 5 Pro (CFI-7000)",why:"Not officially sold in India; grey market there is about ₹80–85k.",jp_tag_jpy:137980,india_inr:null,tip:"About ₹75k after the refund — the saving over grey market is small once you add the transformer and a Japan-only warranty, and it uses your whole ₹75k allowance on its own. No disc drive.",link:null,link_verified:false,jp_source:"Sony price from 2 Apr 2026",india_source:null},
 {id:"ps5-japanese-only-avoid",cat:"ps5",name:"PS5 Digital Edition 日本語専用 — avoid",why:"¥55,000 is tempting, but it's Japanese-language only and works only with a Japan PSN account.",jp_tag_jpy:55000,india_inr:null,tip:"Sony says it's for use in Japan only. Your Indian PSN account and games won't work on it.",link:"https://www.playstation.com/ja-jp/support/hardware/ps5-digital-japanese-only",link_verified:true,jp_source:"playstation.com/ja-jp",india_source:null},
 {id:"ps5-dualsense",cat:"ps5",name:"DualSense controller",why:"No voltage issue, but barely cheaper — buy only for a Japan-only colour.",jp_tag_jpy:11480,india_inr:7490,tip:"Controllers are region-free.",link:null,link_verified:false,jp_source:"Sony Store Japan",india_source:"Reliance Digital (Techno Red)"},
 {id:"snacks-kitkat-mini-otona-no-amasa-d",cat:"snacks",name:"KitKat Mini Otona no Amasa, dark matcha",why:"Japan-only Uji matcha KitKat — cheap, light, easy to hand out.",jp_tag_jpy:null,india_inr:null,tip:"Supermarkets and Donki beat the airport KitKat shop. Food tax is 8%.",link:"https://nestle.jp/home/products/type/confectionary/kitkat",link_verified:true,jp_source:null,india_source:null},
 {id:"snacks-tokyo-banana-8-pieces",cat:"snacks",name:"Tokyo Banana, 8 pieces",why:"Tokyo's best-known souvenir sponge cake.",jp_tag_jpy:1296,india_inr:null,tip:"Keeps about a week — buy at Tokyo Station on 30 Nov or at Haneda, not on day one.",link:"https://www.tokyobanana.jp/",link_verified:true,jp_source:"Pricey.jp (limited editions ¥1,512)",india_source:null},
 {id:"snacks-royce-nama-chocolate-au-lait",cat:"snacks",name:"Royce' Nama Chocolate Au Lait, 20 pieces",why:"The Hokkaido classic, a little cheaper than Royce' stores in India.",jp_tag_jpy:1215,india_inr:1050,tip:"Needs the fridge — ask for an ice pack (hoshizai) and buy it last.",link:null,link_verified:false,jp_source:"Royce official shop via Kakaku.com",india_source:"Royce' India (launch-era report)"},
 {id:"snacks-shiroi-koibito-white-12-piec",cat:"snacks",name:"Shiroi Koibito White, 12 pieces",why:"Iconic white-chocolate biscuit that keeps for months — good office gift.",jp_tag_jpy:1144,india_inr:null,tip:"Haneda and the Hokkaido antenna shops in Tokyo sell it. Safe to buy early.",link:"https://shop.ishiya.co.jp/products/shiroi-koibito_12",link_verified:true,jp_source:"ISHIYA official (from 1 Apr 2026)",india_source:null},
 {id:"snacks-ippodo-matcha-sayaka-no-muka",cat:"snacks",name:"Ippodo matcha Sayaka-no-mukashi 20g",why:"Kyoto tea-house ceremonial matcha at the source price.",jp_tag_jpy:2376,india_inr:null,tip:"The Kyoto main store limits matcha per person and sells out — go early. Sealed tea is fine at Delhi.",link:"https://www.ippodo-tea.co.jp/products/matcha5010331",link_verified:true,jp_source:"Ippodo official",india_source:null},
 {id:"snacks-shogoin-baked-yatsuhashi-24",cat:"snacks",name:"Shogoin baked yatsuhashi, 24 pieces",why:"Kyoto's cinnamon cracker from a shop founded in 1689 — cheap and long-lasting.",jp_tag_jpy:540,india_inr:null,tip:"Take the baked kind home; the soft nama version lasts only a week.",link:"https://shop.shogoin.co.jp/p/item-detail/detail/i9.html",link_verified:true,jp_source:"Shogoin official",india_source:null},
 {id:"anime-gunpla-hg-1-144-gundam-aeria",cat:"anime",name:"Gunpla HG 1/144 Gundam Aerial",why:"Cheap, easy, popular kit that costs far more imported.",jp_tag_jpy:1430,india_inr:null,tip:"Yodobashi Akiba and Bic hobby floors sell 10–20% under list. Restocks go early in the day.",link:null,link_verified:false,jp_source:"Bandai list price",india_source:null},
 {id:"anime-gunpla-rg-1-144-rx-78-2-ver",cat:"anime",name:"Gunpla RG 1/144 RX-78-2 Ver.2.0",why:"The newest Real Grade version of the classic Gundam.",jp_tag_jpy:3850,india_inr:null,tip:"Sells out — try The Gundam Base Tokyo (DiverCity Odaiba), which may use numbered tickets.",link:"https://www.gundam-base.net/",link_verified:true,jp_source:"Premium Bandai via animeanime.jp",india_source:null},
 {id:"anime-nendoroid-figure-good-smile",cat:"anime",name:"Nendoroid figure (Good Smile Company)",why:"Chibi figures that pack small, well under Indian import prices.",jp_tag_jpy:6900,india_inr:null,tip:"Mandarake (Nakano Broadway), Radio Kaikan and Surugaya have older ones at or below list. Check the seal.",link:null,link_verified:false,jp_source:"list price (range ¥3,900–7,654)",india_source:null},
 {id:"anime-pok-mon-center-exclusives",cat:"anime",name:"Pokémon Center exclusives",why:"Plush and goods sold only in Japan.",jp_tag_jpy:null,india_inr:null,tip:"Mega Tokyo (Ikebukuro) limits entry; Shibuya PARCO, Kyoto and Osaka DX are alternatives.",link:null,link_verified:false,jp_source:null,india_source:null},
 {id:"anime-jump-shop-and-mandarake-find",cat:"anime",name:"Jump Shop and Mandarake finds",why:"Licensed One Piece, Jujutsu Kaisen, Dragon Ball goods and rare second-hand figures.",jp_tag_jpy:null,india_inr:null,tip:"Nakano Broadway shops open around noon — go in the afternoon.",link:null,link_verified:false,jp_source:null,india_source:null},
 {id:"hundred-yen-packing-cubes-compression-ba",cat:"hundred-yen",name:"Packing cubes, compression bags, zip pouches",why:"Light organisers for repacking all the shopping before the flight home.",jp_tag_jpy:110,india_inr:null,tip:"Buy on day one. Bigger compression bags are in the ¥220–330 tier.",link:"https://www.daiso-sangyo.co.jp/",link_verified:true,jp_source:"standard price; larger items ¥220–330",india_source:null},
 {id:"hundred-yen-bento-boxes-onigiri-moulds-k",cat:"hundred-yen",name:"Bento boxes, onigiri moulds, kitchen gadgets",why:"Japanese kitchen tools hard to find in India.",jp_tag_jpy:110,india_inr:null,tip:"Seria has the nicest designs. 電子レンジ可 on the label means microwave-safe.",link:null,link_verified:false,jp_source:"standard price",india_source:null},
 {id:"hundred-yen-washi-tape-stickers-statione",cat:"hundred-yen",name:"Washi tape, stickers, stationery",why:"Japanese-pattern stationery far cheaper than Loft's.",jp_tag_jpy:110,india_inr:null,tip:"Seria is best for washi tape; Can★Do in station malls for a quick stop.",link:null,link_verified:false,jp_source:"standard price",india_source:null},
 {id:"hundred-yen-chopstick-sets-tenugui-furos",cat:"hundred-yen",name:"Chopstick sets, tenugui, furoshiki, Japanese tableware",why:"Cheap light gifts that look properly Japanese.",jp_tag_jpy:110,india_inr:null,tip:"Daiso Harajuku and Ginza have whole souvenir sections. Wrap ceramics in clothes.",link:null,link_verified:false,jp_source:"standard price; some ¥220–550",india_source:null},
 {id:"hundred-yen-daiso-beauty-basics-urglam-s",cat:"hundred-yen",name:"Daiso beauty basics (URGLAM, sheet masks, cotton pads)",why:"Decent cosmetics and skincare basics at ¥110–330.",jp_tag_jpy:110,india_inr:null,tip:"Daiso has Indian stores, but Japan's range is far bigger. Look for 日本製, made in Japan.",link:null,link_verified:false,jp_source:"standard price",india_source:null},
 {id:"preowned-used-grand-seiko-9f-quartz-s",cat:"preowned",name:"Used Grand Seiko 9F quartz (SBGX)",why:"Grand Seiko accuracy well under new price; Japan has the deepest used market.",jp_tag_jpy:300000,india_inr:null,tip:"AB rank runs about ¥240–330k. Ranks: SA/A near mint, AB light marks, B visible wear. Take a shop warranty. Well over ₹75k — declare it.",link:"https://www.g-rare.com/c/watch/quartz/10380802",link_verified:true,jp_source:"g-rare (SBGX036, rank AB)",india_source:null},
 {id:"preowned-used-fujifilm-x100v",cat:"preowned",name:"Used Fujifilm X100V",why:"Hard to find new anywhere; Japan's used shops have graded stock with warranty.",jp_tag_jpy:224400,india_inr:null,tip:"Not cheap. Compare Map Camera, Fujiya (Nakano) and Kitamura; ask about the 3–6 month warranty.",link:null,link_verified:false,jp_source:"Fujiya Camera (AB grade)",india_source:null},
 {id:"preowned-olympus-ii-mju-ii-film-compa",cat:"preowned",name:"Olympus μ-II (Mju II) film compact",why:"Popular point-and-shoot, far easier to find in Japan.",jp_tag_jpy:18656,india_inr:null,tip:"Buy only if the shop tested flash and shutter. ジャンク means sold as broken.",link:null,link_verified:false,jp_source:"Yahoo! Auctions average — shops charge more",india_source:null},
 {id:"preowned-canon-ae-1-program-fd-50mm",cat:"preowned",name:"Canon AE-1 Program + FD 50mm",why:"Classic beginner film SLR, much cheaper in Japan.",jp_tag_jpy:14052,india_inr:null,tip:"Check the meter battery, shutter squeal and lens fungus. Prefer AB or better with a warranty.",link:null,link_verified:false,jp_source:"Yahoo! Auctions average — shops charge more",india_source:null},
 {id:"preowned-pre-owned-louis-vuitton-spee",cat:"preowned",name:"Pre-owned Louis Vuitton Speedy, Komehyo",why:"Japan's resale chains authenticate and grade stock, with a big selection.",jp_tag_jpy:null,india_inr:null,tip:"Ranks: 未使用品 unused, A, AB, B. AB is good value. Check handle darkening in person.",link:null,link_verified:false,jp_source:null,india_source:null}
];

/* ---------- India customs ---------- */

/* Duty as a fraction for one of the calculator's options:
   "std" 35% (plus the surcharge only if surcharge_on_baggage is switched on),
   "alt" the 10% post/courier rate, "sws" 35% with the old 10% surcharge. */
function dutyRate(option, cfg) {
  if (option === "alt") return cfg.baggage_duty_rate_alt_pct / 100;
  var r = cfg.baggage_duty_rate_pct / 100;
  if (option === "sws" || cfg.surcharge_on_baggage) r *= 1 + cfg.social_welfare_surcharge_pct / 100;
  return r;
}

/* Above the allowance, Japan only wins if it's this % cheaper: d/(1+d) */
function breakEvenPct(rate) {
  return rate / (1 + rate) * 100;
}

/* input is {items:[{inr, is_laptop}]} or {total, laptop}; total includes the
   laptop. Only the first laptop is exempt — any more are ordinary goods. */
function dutyCalc(input, rate, cfg) {
  var total = 0, laptop = 0;
  if (input.items) {
    input.items.forEach(function (it) {
      var v = it.inr || 0;
      total += v;
      if (cfg.laptop_exempt && it.is_laptop && !laptop) laptop = v;
    });
  } else {
    total = input.total || 0;
    laptop = cfg.laptop_exempt ? Math.min(input.laptop || 0, total) : 0;
  }
  var base = total - laptop;
  var excess = Math.max(0, base - cfg.india_duty_free_inr);
  var duty = excess * rate;
  return {total: total, laptop_value: laptop, dutiable_base: base,
          allowance_used: Math.min(base, cfg.india_duty_free_inr),
          excess: excess, rate: rate, duty: duty, landed: total + duty};
}

/* What the same things would cost in India, if Japan is savingPct cheaper */
function indiaEquivalent(total, savingPct) {
  var s = (savingPct || 0) / 100;
  return s >= 1 ? null : total / (1 - s);
}

/* What each rupee spent past the allowance still saves against India */
function marginalSavingPct(rate, savingPct) {
  return (1 - (1 + rate) * (1 - savingPct / 100)) * 100;
}

function belowBreakEven(savingPct, rate) {
  return savingPct != null && savingPct < breakEvenPct(rate);
}

function scenario(spend, laptop, rate, savingPct, cfg) {
  var c = dutyCalc({total: spend, laptop: laptop}, rate, cfg);
  c.india_equivalent = indiaEquivalent(spend, savingPct);
  c.net_saving = c.india_equivalent == null ? null : c.india_equivalent - c.landed;
  return c;
}

/* Sources for the Customs sub-tab. Shown only when verified. */
var CUSTOMS_LINKS = [
 {title:"Baggage Rules, 2026 (full text)",note:"Notification 14/2026-Customs (N.T.) — ₹75k allowance, laptop proviso, no pooling",url:"https://referencer.in/Baggage_Rules/Baggage_Rules_2026.aspx",verified:true},
 {title:"Baggage duty rate: Notification 26/2016-Customs",note:"35% on the excess, amended by 04/2026",url:"https://referencer.in/Baggage_Rules/26_2016_Customs.aspx",verified:true},
 {title:"Notification 07/2025-Customs (Gazette text)",note:"Entry 8G: baggage (heading 9803) exempt from the 10% surcharge",url:"https://www.indiabudget.gov.in/doc/cen/cus0725.pdf",verified:true},
 {title:"National Tax Agency: refund method Q&A, July 2026",note:"Q32 — the customs check is at the airport you leave Japan from",url:"https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/pdf/0026006-152_01.pdf",verified:true},
 {title:"CBIC: Guide for International Travellers",note:"The official customs guide, updated for Baggage Rules 2026 — check before you fly",url:"https://www.cbic.gov.in/resources/htdocs-cbec/travellerguide_atithi.pdf",verified:true},
 {title:"Atithi — Indian Customs declaration",note:"Declare online before landing if you're over the allowance",url:"https://atithi.cbic.gov.in/",verified:true},
 {title:"Business Today: Baggage Rules 2026",note:"₹75,000 allowance from 2 Feb 2026",url:"https://www.businesstoday.in/amp/india/story/duty-free-import-limit-raised-to-rs-75000-from-rs-50000-what-new-baggage-rules-mean-for-flyers-514130-2026-02-02",verified:true},
 {title:"SCC Times: Baggage Rules 2026 explained",note:"Reads the laptop as on top of the free allowance",url:"https://www.scconline.com/blog/?p=374569",verified:true},
 {title:"Happyfares: why 10% is the post rate",note:"Couldn't be opened, and the site contradicts itself",url:null,verified:false},
 {title:"National Tax Agency: refund method leaflet (English)",note:"90 days, ¥5,000 before tax, how shops refund",url:"https://www.nta.go.jp/publication/pamph/shohi/menzei/202506/pdf/0025006-106.pdf",verified:true},
 {title:"Go Tokyo: tax-free shopping",note:"The refund system from 1 Nov 2026",url:"https://www.gotokyo.org/en/plan/tax-free-shopping/index.html",verified:true},
 {title:"Visit Japan Web",note:"Register first to do the Haneda customs check on your phone",url:"https://services.digital.go.jp/en/visit-japan-web/",verified:true}
];

/* Shops worth knowing, for the Buys sub-tab */
var SHOP_LINKS = [
 {title:"Yodobashi Akiba",note:"electronics, cameras, watches — 28 Nov",url:"https://www.yodobashi-akiba.com/",verified:true},
 {title:"Bic Camera tourist info",note:"tax-free and passport FAQ, in English",url:"https://tourist-info.biccamera.com/s/?language=en_US",verified:true},
 {title:"Don Quijote tax-free",note:"how Donki does tax-free",url:"https://www.donki.com/en/tax_free/",verified:true},
 {title:"Matsumoto Kiyoshi tax-free stores",note:"drugstore finder with a TAX FREE filter",url:"https://faq.matsukiyococokara-online.com/kb/article/%E5%85%8D%E7%A8%8E%E5%BA%97%E3%81%8B%E7%9F%A5%E3%82%8A%E3%81%9F%E3%81%84/",verified:true},
 {title:"Loft",note:"stationery and gifts",url:"https://www.loft.co.jp/en/",verified:true},
 {title:"Hands Shinjuku",note:"formerly Tokyu Hands",url:"https://info.hands.net/en/list/shinjuku/",verified:true},
 {title:"Aritsugu, Nishiki Market",note:"Kyoto knife maker since 1560",url:"https://aritsugu.co.jp/",verified:true},
 {title:"Tojiro",note:"the value knife brand, made in Tsubame-Sanjo",url:"https://tojiro.net/",verified:true},
 {title:"Japan iPhone shutter sound",note:"why Japan-market iPhones can't mute it (BGR)",url:"https://www.bgr.com/2202551/why-you-cant-turn-off-camera-shutter-sound-on-japanese-iphones/",verified:true}
];

var api = {
  CONFIG: CONFIG, WATCHES: WATCHES, SHOP_ITEMS: SHOP_ITEMS, SHOP_PRODUCTS: SHOP_PRODUCTS, CUSTOMS_LINKS: CUSTOMS_LINKS, SHOP_LINKS: SHOP_LINKS, JAPAN_ONLY: JAPAN_ONLY,
  JAPAN_ONLY_RATE: JAPAN_ONLY_RATE, ABOVE_BUDGET: ABOVE_BUDGET,
  refundApplies: refundApplies, effectiveInr: effectiveInr, savingPct: savingPct,
  bandOf: bandOf, movementKind: movementKind, priced: priced, pricedProduct: pricedProduct,
  dutyRate: dutyRate, breakEvenPct: breakEvenPct, dutyCalc: dutyCalc,
  indiaEquivalent: indiaEquivalent, marginalSavingPct: marginalSavingPct,
  belowBreakEven: belowBreakEven, scenario: scenario
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.Bakugai = api;

})(this);
