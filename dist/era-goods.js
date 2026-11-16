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
export const ERA_GOODS=Object.fromEntries([...Object.entries(groups),...Object.entries(fifthGroups)].flatMap(([family,rows])=>rows.map(([id,name,base,ports,era])=>[id,{name,base,ports:ports.split(' '),era,family,icon:'◈',color:'#476c65'}])));

const targetPorts={
 1:['zanzibar','goa','chennai','colombo','aden','muscat'],
 2:['lisbon','porto','seville','cape','malacca','ternate'],
 3:['manila','acapulco','callao','macau','shanghai','busan'],
 4:['amsterdam','london','bordeaux','havana','halifax','nagasaki','veracruz'],
 5:['london','amsterdam','porto','halifax','boston','havana','rio','cape','portlouis','zanzibar','goa','malacca','manila','nagasaki','honolulu','sydney','batavia','cartagena']
};
const regionalImports={
 '유럽':[['dates','sandalwood'],['pepper','cloves'],['silk','silver'],['cacao','indigo'],['tea','porcelain']],
 '아프리카':[['cotton','dates'],['driedfish','timber'],['copper','glass'],['sugar','coffee'],['tea','porcelain']],
 '아시아':[['oliveoil','dates'],['timber','cinnamon'],['silver','cacao'],['coffee','indigo'],['glass','sugar']],
 '북아메리카':[['salt','oliveoil'],['timber','pepper'],['silver','porcelain'],['indigo','coffee'],['tea','glass']],
 '남아메리카':[['oliveoil','dates'],['timber','pepper'],['silk','porcelain'],['coffee','indigo'],['tea','glass']],
 '오세아니아':[['cotton','oliveoil'],['timber','pepper'],['silver','porcelain'],['sugar','coffee'],['tea','glass']]
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
 return era&&item.era===era.id&&targetPorts[era.id]?.includes(port.id)?1.11:1;
}
