const silhouettes={
 felucca:['M-17 8Q-10 17 10 16L17 8Z','M-3-22L-17 5L11 1Z','#fff3d0'],
 galley:['M-21 6L21 6L13 15H-13Z','M0-23L-15 3L12-1ZM-16 9l-4 8m10-8-5 9m11-9-4 9m10-9-4 9m10-9-4 9m10-9-4 8','#e8bc78'],
 fluyt:['M-13 5L13 5L17 11Q15 21 0 22Q-15 21-17 11Z','M-14-15h12V0h-11zM1-21h13V-4H1zM2-1h12v6H2z','#fff0ce'],
 fujian:['M-19 5L18 1L12 17H-13Z','M-15-15L-5-24V3L-16 1ZM-3-13L10-21L12 0L-3 4Z','#d99c62'],
 baghlah:['M-17 7L8 6L19 0L13 16H-9Z','M-7-24L-17 4L10 1ZM10-15L6 4L18 2Z','#f4dfad'],
 waka:['M-22 8Q-13 16-3 10L-5 17Q-14 21-20 15ZM3 8Q13 16 22 10L20 17Q13 21 5 15Z','M0-24L-13 5Q5 1 12-7Z M-12 10H12','#e9bc78'],
 panok:['M-20 7H20L13 19H-13Z M-17 2H17V8H-17Z','M-13-12h12v13h-12zM2-21h12V1H2z','#f9e4b0'],
 endeavour:['M-18 5H18L14 15L-13 19Z','M-14-18h10V1h-10zM-2-24h13V-9H-2zM-2-6h12v10H-2zM11-11l7 10h-7z','#e1e9d3'],
 turtle:['M-21 7H20L12 18H-15Z M-16 7Q-12-13 0-14Q12-14 16 7Z M15 6l4-9 5 1 1 4-6 1-2 5Z','M-13 1H13M-8-7H8M-5-12L-6 6M5-12L6 6','#b5b8a0']
};
export function historicalGlyph(kind,ink){
 if(!Object.hasOwn(silhouettes,kind))return '';
 const [hull,rig,color]=silhouettes[kind];
 return `<g stroke-linejoin="round"><path d="${hull}" fill="#8b5d38" stroke="#4b362a" stroke-width="1.4"/><path d="M-12 11H12" stroke="#d9a85d"/><path d="${rig}" fill="${color}" stroke="${ink}" stroke-width="1.1"/></g>`;
}
export function historicalArt(kind){
 const glyph=historicalGlyph(kind,'#294c4e');
 if(!glyph)return '';
 return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-34 -32 68 58"><rect x="-34" y="-32" width="68" height="58" rx="3" fill="#e6efdf"/><circle cx="18" cy="-15" r="8" fill="#f6dca1"/><path d="M-34 10H34V26H-34Z" fill="#a5c9c8"/><path d="M-28 20H-8M7 22h19" stroke="#f4f6e7"/>${glyph}</svg>`);
}
