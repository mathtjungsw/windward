// id, Korean name, base price, producer ports, themed era (0 = all eras).
const groups={
 grain:[['wheat','밀',32,'bordeaux cologne'],['barley','보리',28,'dublin london'],['rye','호밀',31,'cologne amsterdam'],['rice','쌀',38,'chennai wuhan manila',1],['millet','조',32,'busan shanghai'],['sorghum','수수',30,'accra dakar',1],['maize','옥수수',34,'veracruz callao',3],['buckwheat','메밀',40,'busan nagasaki'],['beans','말린 콩',37,'bordeaux buenos'],['chickpeas','병아리콩',39,'marseille alexandria'],['lentils','렌틸콩',39,'alexandria istanbul'],['sweet-potato','고구마',42,'callao veracruz',3],['cassava','카사바',41,'recife belem',4],['sesame','참깨',45,'goa muscat',1]],
 leather:[['cattle-hide','소가죽',68,'buenos dublin'],['goat-hide','염소가죽',65,'aden muscat',1],['sheepskin','양가죽',63,'dublin bordeaux'],['camel-hide','낙타가죽',80,'aden cairo',1],['reindeer-hide','순록가죽',110,'amsterdam',4],['deerskin','사슴가죽',99,'boston halifax',4],['beaver-pelt','비버 모피',190,'halifax boston',4],['marten-pelt','담비 모피',172,'amsterdam london',4],['alpaca-fibre','알파카 털',114,'callao iquique',3],['morocco-leather','모로코 무두질 가죽',126,'seville',2]],
 cotton:[['flax','아마',43,'cologne bordeaux'],['linen','리넨',86,'amsterdam bordeaux'],['hemp-cloth','삼베',63,'busan chennai'],['printed-calico','무명 날염포',102,'chennai goa',1],['persian-carpet','페르시아 융단',210,'muscat istanbul',1],['brocade','금실 비단',225,'shanghai macau',3],['damask','다마스크 직물',165,'istanbul venice'],['sailcloth','돛천',86,'lisbon amsterdam',2],['felt-cloth','펠트 직물',93,'london amsterdam',4]],
 timber:[['oak','참나무 목재',72,'london bordeaux'],['pine','소나무 목재',54,'cologne amsterdam'],['teak','티크 목재',90,'goa malacca',2],['cedar','삼나무 목재',79,'nagasaki'],['pine-resin','송진',60,'bordeaux lisbon',2],['hemp-rope','삼 로프',70,'lisbon amsterdam',2],['coconut-coir','코코넛 섬유 밧줄',73,'colombo malacca',1],['ebony','흑단',128,'zanzibar goa',1],['bamboo','대나무',42,'batavia manila'],['tar','목재 타르',74,'amsterdam london',2]],
 porcelain:[['blue-porcelain','청화백자',160,'shanghai manila',3],['joseon-porcelain','조선 백자',154,'busan',3],['imari','이마리 자기',175,'nagasaki',4],['celadon','청자',147,'shanghai busan',3],['lacquerware','옻칠 공예품',167,'nagasaki macau',3],['stoneware-jar','석기 저장 항아리',80,'batavia manila'],['silverwork','은세공품',199,'acapulco venice',3],['brassware','황동 공예품',128,'istanbul venice'],['tin','주석',82,'malacca',2]],
 spice:[['madder','꼭두서니 염료',94,'marseille istanbul',4],['cochineal','코치닐 염료',156,'veracruz acapulco',4],['dyed-indigo-cloth','쪽물 염색천',122,'chennai goa',4],['turmeric','강황',78,'chennai colombo',2],['frankincense','유향',135,'aden muscat',1],['myrrh','몰약',148,'aden jeddah',1],['cardamom','카르다몸',113,'chennai goa',1],['gum-arabic','아라비아고무',71,'dakar alexandria',4],['camphor','장뇌',137,'malacca batavia',2]],
 driedfish:[['molasses','사탕수수 당밀',62,'havana recife',4],['dried-fig','말린 무화과',59,'marseille istanbul'],['salt-cod','소금에 절인 대구',61,'halifax lisbon',2],['dried-shrimp','말린 새우',61,'manila macau'],['beeswax','밀랍',78,'dakar bordeaux'],['salt-beef','소금에 절인 쇠고기',68,'buenos dublin'],['raisins','건포도',62,'seville marseille'],['aged-vinegar','숙성 식초',55,'bordeaux venice']]
};
const fifthGroups={
 tea:[['wuyi-black-tea','무이산 홍차',142,'macau',5],['songluo-green-tea','송라 녹차',126,'shanghai',5],['pressed-tea','압축 차',116,'wuhan',5]],
 porcelain:[['export-punch-bowl','수출용 펀치 사발',168,'macau shanghai',5],['enamel-porcelain','채색 수출 자기',192,'macau',5],['delftware','델프트 채색 도기',135,'amsterdam',5]],
 silk:[['painted-fan','채색 부채',129,'macau manila',5]],
 sugar:[['sugar-loaf','원뿔형 정제 설탕',96,'amsterdam bordeaux',5],['cane-syrup','사탕수수 시럽',70,'havana belem portlouis',5]],
 coffee:[['roasted-coffee','볶은 커피콩',113,'batavia aden',5]],
 spice:[['nutmeg-mace','육두구 겉껍질 향료',128,'bandaneira ternate',5]],
 wool:[['striped-wool','줄무늬 모직물',119,'london bordeaux',5]],
 timber:[['ship-blocks','범선 도르래 목구',99,'london amsterdam',5]],
 oliveoil:[['coconut-oil','코코넛 기름',69,'colombo suva apia',5]]
};
const regionalGoods=[
 ['cork','코르크',67,'lisbon seville',0,'timber','bordeaux london'],
 ['dried-pomegranate','말린 석류',54,'istanbul alexandria',0,'grain','marseille venice'],
 ['salted-sardines','소금에 절인 정어리',51,'porto funchal',0,'driedfish','seville bordeaux'],
 ['liquorice-root','감초 뿌리',69,'alexandria istanbul',0,'spice','venice marseille'],
 ['rattan','등나무',62,'malacca batavia',0,'timber','manila goa'],
 ['dried-lime','말린 라임',64,'muscat aden',1,'spice','jeddah alexandria'],
 ['coriander-seed','고수 씨',56,'chennai goa',1,'spice','colombo aden'],
 ['ship-nails','선박용 철 못',77,'lisbon london',2,'copper','funchal laspalmas'],
 ['barley-malt','보리 맥아',48,'dublin london',2,'grain','amsterdam bordeaux'],
 ['mother-of-pearl','자개 공예 재료',129,'manila macau',3,'porcelain','nagasaki acapulco'],
 ['mulberry-paper','닥종이',89,'busan',3,'silk','nagasaki shanghai'],
 ['annatto-dye','안나토 염료',95,'belem manaus',4,'spice','recife lisbon'],
 ['parchment','양피지',96,'bordeaux london',4,'leather','amsterdam marseille'],
 ['tinplate','주석 도금 철판',107,'london amsterdam',5,'copper','lisbon bordeaux'],
 ['tea-chest','차 보관 상자',82,'macau shanghai',5,'timber','amsterdam london']
];
export const REGIONAL_GOOD_IDS=regionalGoods.map(([id])=>id);
const surveyGoods=[
 ["survey-sextant","황동 육분의",212,"london",6,"copper","cape boston"],
 ["marine-timekeeper","항해용 정밀시계",262,"london",6,"copper","cape macau"],
 ["lunar-almanac","월거리 항해력",104,"london amsterdam",6,"silk","boston goa"],
 ["engraved-sea-chart","동판 인쇄 해도",128,"amsterdam bordeaux",6,"copper","sydney buenos"],
 ["sounding-lead","측심용 납추",65,"london venice",6,"copper","shanghai callao"],
 ["brass-dividers","황동 제도 컴퍼스",90,"amsterdam london",6,"copper","manila veracruz"],
 ["survey-chain","측량 사슬",97,"london",6,"copper","rio cape"],
 ["specimen-paper","식물 압지",72,"amsterdam bordeaux",6,"cotton","batavia cape"],
 ["specimen-glass","표본 유리병",92,"venice amsterdam",6,"glass","portlouis sydney"],
 ["botanical-prints","채색 식물 도판",153,"london",6,"silk","shanghai boston"],
 ["boxwood-rules","회양목 눈금자",74,"london bordeaux",6,"timber","goa callao"],
 ["copper-sheathing","선저 피복 동판",113,"london",6,"copper","cape havana"],
 ["kashmir-shawls","카슈미르 숄",198,"goa muscat",6,"wool","london marseille"],
 ["blockprint-muslin","목판 날염 모슬린",143,"chennai goa",6,"cotton","bordeaux batavia"],
 ["indian-palampore","인도산 화문 침대보",160,"chennai",6,"cotton","amsterdam cape"],
 ["lac-dye","락충 붉은 염료",112,"goa chennai",6,"spice","london nagasaki"],
 ["shellac-flakes","판상 셸락",88,"goa chennai",6,"spice","london venice"],
 ["westlake-ink","그림 먹",122,"shanghai wuhan",6,"silk","nagasaki manila"],
 ["pith-paper","통초 종이",90,"macau",6,"silk","london manila"],
 ["qing-embroidered-satin","자수 공단",167,"shanghai",6,"silk","amsterdam nagasaki"],
 ["lacquer-inro","옻칠 인롱",145,"nagasaki",6,"porcelain","macau london"],
 ["blue-water-dropper","청화 연적",115,"busan",6,"porcelain","nagasaki shanghai"],
 ["basalt-ware","검은 석기",118,"london",6,"porcelain","boston porto"],
 ["printed-cotton-kerchief","날염 면 손수건",81,"bordeaux chennai",6,"cotton","havana recife"],
 ["tapa-cloth","나무껍질 천",92,"papeete apia suva",6,"cotton","sydney manila"],
 ["harakeke-fibre","하라케케 섬유",78,"auckland",6,"timber","sydney cape"],
 ["breadfruit-flour","말린 빵나무 열매",56,"papeete suva",6,"grain","sydney portlouis"],
 ["yerba-mate","예르바 마테",74,"buenos",6,"tea","valparaiso rio"],
 ["quebracho-timber","케브라초 목재",84,"buenos",6,"timber","rio cape"],
 ["quinine-bark","기나나무 껍질",138,"callao",6,"spice","lisbon london"],
 ["brazilwood-chips","브라질목 염료 조각",112,"recife",6,"spice","bordeaux amsterdam"],
 ["cape-wine-casks","케이프산 포도주",98,"cape",6,"wine","batavia london"]
];
export const SURVEY_GOOD_IDS=surveyGoods.map(([id])=>id);
const goodsEntry=(id,name,base,ports,era,family,markets='')=>[id,{name,base,ports:ports.split(' '),era,family,markets:markets?markets.split(' '):[],icon:'◈',color:'#476c65'}];
export const ERA_GOODS=Object.fromEntries([
 ...[...Object.entries(groups),...Object.entries(fifthGroups)].flatMap(([family,rows])=>rows.map(([id,name,base,ports,era])=>goodsEntry(id,name,base,ports,era,family))),
 ...regionalGoods.map(row=>goodsEntry(...row)),
 ...surveyGoods.map(row=>goodsEntry(...row))
]);

const targetPorts={
 1:['zanzibar','goa','chennai','colombo','aden','muscat'],
 2:['lisbon','porto','seville','cape','malacca','ternate'],
 3:['manila','acapulco','callao','macau','shanghai','busan'],
 4:['amsterdam','london','bordeaux','havana','halifax','nagasaki','veracruz'],
 5:['london','amsterdam','porto','halifax','boston','havana','rio','cape','portlouis','zanzibar','goa','malacca','manila','nagasaki','honolulu','sydney','batavia','cartagena'],
 6:['cape','boston','london','amsterdam','papeete','auckland','sydney','portlouis','manila','callao','vancouver']
};
const regionalImports={
 '유럽':[['dates','sandalwood'],['pepper','cloves'],['silk','silver'],['cacao','indigo'],['tea','porcelain'],["kashmir-shawls", "westlake-ink"]],
 '아프리카':[['cotton','dates'],['driedfish','timber'],['copper','glass'],['sugar','coffee'],['tea','porcelain'],["sounding-lead", "specimen-paper"]],
 '아시아':[['oliveoil','dates'],['timber','cinnamon'],['silver','cacao'],['coffee','indigo'],['glass','sugar'],["survey-sextant", "engraved-sea-chart"]],
 '북아메리카':[['salt','oliveoil'],['timber','pepper'],['silver','porcelain'],['indigo','coffee'],['tea','glass'],["basalt-ware", "brass-dividers"]],
 '남아메리카':[['oliveoil','dates'],['timber','pepper'],['silk','porcelain'],['coffee','indigo'],['tea','glass'],["lunar-almanac", "specimen-glass"]],
 '오세아니아':[['cotton','oliveoil'],['timber','pepper'],['silver','porcelain'],['sugar','coffee'],['tea','glass'],["boxwood-rules", "specimen-paper"]]
};
export function regionalEraGoods(port,era){
 const region=regionalImports[port.region]||regionalImports['유럽'];
 return era?.version===2&&era.id?region[era.id-1]:[];
}
export function eraTradeFactor(port,id,mode,era){
 const regional=regionalEraGoods(port,era).includes(id);
 const item=ERA_GOODS[id];
 if(!item)return regional?(mode==='sell'?1.06:1.03):1;
 const source=item.ports.includes(port.id);
 if(mode==='buy')return source&&era&&item.era===era.id?0.94:1;
 if(source)return 1;
 if(item.markets.includes(port.id))return item.era&&item.era!==era?.id?1.1:1.31;
 return era&&item.era===era.id&&targetPorts[era.id]?.includes(port.id)?1.11:1;
}
