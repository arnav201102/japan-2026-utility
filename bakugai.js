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
function effectiveInr(tagJpy, rate, cfg) {
  var jpy = refundApplies(tagJpy, cfg) ? tagJpy / (1 + cfg.tax_refund_pct / 100) : tagJpy;
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
 {id:"knives",category:"Japanese knives",examples:"Tojiro, Global, Shun, Kai",saving_pct_min:40,saving_pct_max:60,where_to_buy:"Kappabashi (Tokyo); Aritsugu, Nishiki Market (Kyoto); department stores",catch:"Must go in checked baggage",counts_toward_allowance:true,is_laptop:false,link:"https://www.kappabashi.or.jp/en/",link_verified:true},
 {id:"muji",category:"Muji",examples:"stationery, travel pouches, clothing",saving_pct_min:30,saving_pct_max:50,where_to_buy:"Muji stores",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://www.muji.com/jp/ja/store/cmdty/section-top/home",link_verified:true},
 {id:"onitsuka",category:"Onitsuka Tiger / Asics",examples:"sneakers",saving_pct_min:25,saving_pct_max:40,where_to_buy:"brand stores; department stores",catch:"Japan-only models sell out",counts_toward_allowance:true,is_laptop:false,link:"https://www.onitsukatiger.com/jp/ja-jp/",link_verified:true},
 {id:"uniqlo",category:"Uniqlo",examples:"Heattech, Ultra Light Down",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Uniqlo stores",catch:"Small saving — once dutied above the allowance it can cost more than in India",counts_toward_allowance:true,is_laptop:false,link:"https://www.uniqlo.com/jp/ja/special-feature/tax-free",link_verified:true},
 {id:"skincare",category:"Skincare & sunscreen",examples:"Biore, Anessa, Hada Labo, Shiseido, Curel",saving_pct_min:40,saving_pct_max:60,where_to_buy:"Matsumoto Kiyoshi; Don Quijote; drugstores",catch:"Liquids over 100 ml must go in checked baggage",counts_toward_allowance:true,is_laptop:false,link:"https://www.donki.com/en/tax_free/",link_verified:true},
 {id:"stationery",category:"Stationery & pens",examples:"Pilot, Uni, Zebra, Sailor",saving_pct_min:40,saving_pct_max:60,where_to_buy:"Loft; Hands; Itoya (Ginza)",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://www.ito-ya.co.jp/",link_verified:true},
 {id:"cameras",category:"Cameras & lenses",examples:"Sony, Canon, Fujifilm, Nikon",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Yodobashi Camera; Bic Camera; Map Camera",catch:"Check for English menus; warranty may be Japan-only",counts_toward_allowance:true,is_laptop:false,link:"https://www.mapcamera.com/html/worldguide/english_page.html",link_verified:true},
 {id:"audio",category:"Headphones / IEMs",examples:"Sony, Audio-Technica, Final",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Yodobashi; e-earphone (Akihabara)",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://www.e-earphone.jp/pages/shop_list",link_verified:true},
 {id:"whisky",category:"Japanese whisky & sake",examples:"Suntory Toki, Nikka, Hibiki, local sake",saving_pct_min:20,saving_pct_max:50,where_to_buy:"liquor shops; department store food halls",catch:"2 litres duty-free per adult; premium bottles are rationed",counts_toward_allowance:true,is_laptop:false,link:null,link_verified:false},
 {id:"macbook",category:"MacBook",examples:"MacBook Air / Pro",saving_pct_min:10,saving_pct_max:20,where_to_buy:"Apple Store; Yodobashi",catch:"Store stock has a Japanese (JIS) keyboard — order an English layout online in advance",counts_toward_allowance:false,is_laptop:true,link:"https://www.apple.com/jp/retail/shinjuku/",link_verified:true},
 {id:"iphone",category:"iPhone",examples:"iPhone",saving_pct_min:10,saving_pct_max:20,where_to_buy:"Apple Store; Bic Camera",catch:"Camera shutter sound can't be turned off",counts_toward_allowance:true,is_laptop:false,link:"https://www.apple.com/jp/retail/ginza/",link_verified:true},
 {id:"switch2",category:"Nintendo Switch 2",examples:"console",saving_pct_min:15,saving_pct_max:30,where_to_buy:"Yodobashi; Bic Camera",catch:"Buy only the multi-language version — the cheaper Japanese one is locked to Japanese language and accounts",counts_toward_allowance:true,is_laptop:false,link:"https://www.nintendo.com/jp/hardware/switch2/lineup/japan-only/index.html",link_verified:true},
 {id:"snacks",category:"Snacks & gifts",examples:"matcha, KitKat flavours, Tokyo Banana, gacha toys",saving_pct_min:null,saving_pct_max:null,where_to_buy:"konbini; Don Quijote; Kyoto tea shops",catch:"Food must be declared if asked",counts_toward_allowance:true,is_laptop:false,link:null,link_verified:false},
 {id:"anime",category:"Anime figures & Gunpla",examples:"scale figures, Gundam kits, trading cards",saving_pct_min:null,saving_pct_max:null,where_to_buy:"Akihabara; Nakano Broadway",catch:null,counts_toward_allowance:true,is_laptop:false,link:"https://nakano-broadway.com/",link_verified:true},
 {id:"hundred-yen",category:"100-yen shops",examples:"kitchen gadgets, storage, travel bits",saving_pct_min:null,saving_pct_max:null,where_to_buy:"Daiso; Seria; Can★Do",catch:"Mostly under ¥5,000 a shop, so no tax refund",counts_toward_allowance:true,is_laptop:false,link:"https://www.daiso-sangyo.co.jp/",link_verified:true},
 {id:"preowned",category:"Pre-owned cameras, watches, bags",examples:"used Grand Seiko, film cameras, lenses",saving_pct_min:null,saving_pct_max:null,where_to_buy:"Komehyo Shinjuku; Map Camera; Nakano Broadway",catch:"The warranty is the shop's, not the brand's",counts_toward_allowance:true,is_laptop:false,link:"http://www.en.komehyo.co.jp/store/tokyo/shinjuku/index.html",link_verified:true}
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
  CONFIG: CONFIG, WATCHES: WATCHES, SHOP_ITEMS: SHOP_ITEMS, CUSTOMS_LINKS: CUSTOMS_LINKS, SHOP_LINKS: SHOP_LINKS, JAPAN_ONLY: JAPAN_ONLY,
  JAPAN_ONLY_RATE: JAPAN_ONLY_RATE, ABOVE_BUDGET: ABOVE_BUDGET,
  refundApplies: refundApplies, effectiveInr: effectiveInr, savingPct: savingPct,
  bandOf: bandOf, movementKind: movementKind, priced: priced,
  dutyRate: dutyRate, breakEvenPct: breakEvenPct, dutyCalc: dutyCalc,
  indiaEquivalent: indiaEquivalent, marginalSavingPct: marginalSavingPct,
  belowBreakEven: belowBreakEven, scenario: scenario
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.Bakugai = api;

})(this);
