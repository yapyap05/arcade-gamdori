/**
 * 운세 도트 그림 (원본 today_fortune 의 cards.js · app.js 그림 코드를 옮김)
 * 모든 함수는 SVG 문자열을 돌려줌 — 우리 코드가 만든 그림만 들어가고 사용자 입력은 섞이지 않음
 *
 *  화투 카드   : hwatu(i, z)  i=0~11 (1~12월)   / hwatuBack(z)
 *  타로 카드   : tarot(i, z)  i=0~21            / tarotBack(z)
 *  오미쿠지    : omiFace(z) · omiBack(z) · omiTong(z) · omiPaper(t, z)  t=0 길 / 1 보통 / 2 흉
 *  띠 캐릭터   : animal(i, z) i=0~11 (쥐~돼지)
 *  아이콘·그림 : pixel(key, z, palette?)  key = MP 의 이름 (pine, star, heart ...)
 *  z = 한 칸 크기(px)
 */

/* ───────── 카드 (18x26칸) ───────── */

const CP={k:'#2b2147',w:'#ffffff',e:'#fbf3dc',E:'#e2d3a3',r:'#e0455f',R:'#a02444',p:'#ffb3cf',y:'#ffd75e',Y:'#d9a128',o:'#ff9a4a',g:'#9bdc6f',G:'#3b9a5f',D:'#1f5f3c',b:'#7cc0ff',B:'#3b6fd0',N:'#1d2457',n:'#9a6a3a',m:'#5a3820',v:'#b79af0',s:'#d4cfe6',S:'#8f89a8',t:'#f4c9a0',h:'#5a3820',c:'#e0455f',C:'#a02444'};
const CW=18,CH_=26;
function grid(){const g=[...Array(CH_)].map(()=>Array(CW).fill('.'));
 const o={g,
  p:(x,y,c)=>{if(x>=0&&x<CW&&y>=0&&y<CH_&&c!='.')g[y][x]=c;return o},
  r:(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)o.p(x+i,y+j,c);return o},
  c:(cx,cy,R,c)=>{for(let y=0;y<CH_;y++)for(let x=0;x<CW;x++)if((x-cx)**2+(y-cy)**2<=R*R+R*.6)o.p(x,y,c);return o},
  s:(x,y,m,pal={})=>{m.split('/').forEach((row,j)=>[...row].forEach((ch,i)=>o.p(x+i,y+j,pal[ch]||ch)));return o}};
 return o}
const base=(bg,inn='E')=>{const o=grid();return o.r(1,0,CW-2,CH_,'k').r(0,1,CW,CH_-2,'k').r(1,1,CW-2,CH_-2,inn).r(2,2,CW-4,CH_-4,bg)};
const cardSvg=(o,z)=>{let s='';o.g.forEach((r,y)=>{for(let x=0;x<CW;){const c=r[x];let n=1;while(r[x+n]==c)n++;if(c!='.')s+=`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${CP[c]}"/>`;x+=n}});return`<svg viewBox="0 0 ${CW} ${CH_}" width="${CW*z}" height="${CH_*z}" shape-rendering="crispEdges">${s}</svg>`};

/* 화투 */
function songhak(){const o=base('e'),A='.DDGGDD../DGGgGGGD./.DGGGGDD./..DDDD...';
 o.c(13,6,3,'r').p(12,5,'p').p(13,5,'p').p(15,7,'R').p(14,8,'R').p(13,8,'R');
 o.r(3,8,2,14,'n').p(4,9,'m').p(4,12,'m').p(4,16,'m').p(3,19,'m').r(5,7,1,2,'m');
 o.s(2,3,A).s(3,7,A).s(1,11,A);
 o.r(2,22,14,2,'g').r(2,23,14,1,'G');
 o.s(6,11,'.......rw./.......wwo/......ww../......ww../....wwwws./..wwwwwwws/kkwwwwwwss/.kwwwwwss./...wwwss.../.....k.k../.....k.k..'.replace('.......wwo/','.......wwo./').replace('.......wwo./......','.......wwo./......').replace('.......rw./','.......rw../'));
 return o}
function moran(){const o=base('e'),L='.GGGG./GggGGG/.GGGG.';
 o.r(8,16,2,6,'G').r(2,22,14,2,'g').s(3,17,L).s(10,18,L);
 o.c(9,10,6,'R').c(9,10,5,'r').c(9,10,3,'p').c(9,10,1,'y');
 [[6,8],[12,8],[7,13],[11,13],[9,6],[5,11],[13,11]].forEach(([x,y])=>o.p(x,y,'R'));
 [[8,9],[10,11],[8,11],[10,9]].forEach(([x,y])=>o.p(x,y,'Y'));
 o.s(3,3,'v.k.v/vvkvv/.v.v.').s(11,3,'o.k.o/ookoo/.o.o.');
 return o}
function gongsan(){const o=base('N');
 [[4,4],[13,3],[15,8],[3,9],[7,3],[11,5]].forEach(([x,y],i)=>o.p(x,y,i%2?'y':'w'));
 o.c(9,9,5,'y').c(8,8,3,'w').p(11,10,'Y').p(12,10,'Y').p(10,12,'Y').p(11,12,'Y').p(7,11,'Y');
 o.s(8,6,'k.k/.k.');
 o.s(2,17,'....kkk......./..kkkkkkk..kk./kkkkkkkkkkkkkk').r(2,20,14,4,'k');
 [[5,18],[5,17],[12,18],[12,17],[13,18]].forEach(([x,y])=>o.p(x,y,'S'));
 o.p(5,16,'s').p(12,16,'s');
 return o}
function danpung(){const o=base('e'),M='..r../.rrr./rrRrr/.rrr./..n..';
 o.r(2,4,6,1,'m').r(7,5,5,1,'m').r(11,6,4,1,'m').r(3,5,1,1,'m');
 o.s(2,6,M).s(9,6,M,{r:'o',R:'Y'}).s(4,12,M,{r:'o',R:'Y'}).s(10,12,M).s(6,17,M);
 o.r(2,22,14,2,'E').p(3,22,'r').p(7,23,'o').p(12,22,'r').p(14,23,'Y');
 return o}
function back(a,b){const o=base(a,'Y');
 for(let y=3;y<23;y++)for(let x=3;x<15;x++)if((x+y)%4==0||(x-y+40)%4==0)o.p(x,y,b);
 return o.c(9,13,3,'y').c(9,13,2,a).p(9,13,'y')}

/* 타로 */
function fool(){const o=base('b','Y');
 o.c(4,5,2,'y').r(9,4,4,1,'w').r(10,3,2,1,'w');
 o.s(2,10,'...w.......w../..www.....www./.wwwww...wwwww');
 o.r(2,16,8,2,'g').r(2,18,8,6,'S').r(10,20,6,4,'B');
 o.s(7,5,'..rw../.rrrr./..tt../..tt../.yyyy./yyyyyy/.yyyy./..BB../..BB../.BB.B./.kk.k.'.replace('yyyyyy/','yyyyyy./').replace('.kk.k.','.kk.k.'));
 o.p(13,8,'n').p(12,9,'n').p(11,10,'n').r(13,5,3,3,'r').p(14,6,'w');
 o.s(2,13,'.wwk./wwww./w..w.');
 return o}
function star(){const o=base('N','Y');
 o.s(6,3,'...y.../...y.../yyyyyyy/.yyyyy./..yyy../.yy.yy./yy...yy');
 [[3,4],[14,5],[3,11],[14,10],[11,3],[4,8],[13,13]].forEach(([x,y],i)=>o.p(x,y,i%2?'y':'w'));
 o.r(2,19,14,5,'B').r(4,20,3,1,'b').r(10,21,4,1,'b').r(6,22,2,1,'b');
 o.s(6,11,'..yyy./.yttt./.yttt./..tt../.vvvv./vvvvvv/vvvvvv/.t..t.');
 o.s(10,12,'bbb/bBb/.b.').r(11,15,1,4,'b');
 return o}
function moon(){const o=base('N','Y');
 o.c(9,7,4,'y').c(11,7,3,'N');
 [[9,2],[4,3],[14,3],[3,7],[15,7]].forEach(([x,y])=>o.p(x,y,'y'));
 o.r(2,10,3,10,'S').r(13,10,3,10,'S').r(2,10,1,10,'s').r(13,10,1,10,'s');
 [[2,9],[4,9],[13,9],[15,9]].forEach(([x,y])=>o.p(x,y,'S'));
 o.p(3,13,'y').p(14,13,'y').p(3,16,'y').p(14,16,'y');
 o.r(8,12,2,2,'E').r(7,14,4,3,'E').r(6,17,6,3,'E').r(2,20,14,4,'D');
 o.s(3,18,'.kk./kkkk').s(11,18,'.kk./kkkk');
 o.s(7,21,'r..r/.rr.');
 return o}
function sun(){const o=base('b','Y');
 [[0,-5],[0,-6],[5,0],[6,0],[-5,0],[-6,0],[0,5],[0,6],[4,-4],[5,-5],[-4,-4],[-5,-5],[4,4],[5,5],[-4,4],[-5,5]].forEach(([x,y])=>o.p(9+x,8+y,'y'));
 o.c(9,8,4,'y').p(8,7,'k').p(10,7,'k').p(7,9,'o').p(11,9,'o').r(8,10,3,1,'R');
 o.r(2,17,14,7,'R');
 for(let y=17;y<24;y++)for(let x=2;x<16;x++)if(y%3==0||(x+(y%2?0:2))%4==0)o.p(x,y,'r');
 [[4,14],[13,14]].forEach(([x,y])=>{o.c(x,y,2,'y').p(x,y,'m').r(x,16,1,2,'G')});
 return o}

/* 오미쿠지 */
function tong(){const o=grid();
 [[5,3],[7,1],[9,4],[11,2],[8,5],[6,6],[10,6]].forEach(([x,h],i)=>{o.r(x,h+2,1,9,i%2?'n':'E').p(x,h+2,'r').p(x,h+3,'r')});
 o.r(3,10,12,13,'r').r(3,10,2,13,'o').r(13,10,2,13,'R');
 o.r(3,10,12,2,'y').r(3,21,12,2,'y').r(3,11,12,1,'Y').r(3,22,12,1,'Y');
 o.r(6,14,6,5,'e').r(6,14,6,1,'E');
 [[7,15],[9,15],[11,15],[7,17],[9,17]].forEach(([x,y])=>o.r(x-(x==11?1:0),y,1,2,'k'));
 o.r(4,24,10,1,'S');
 return o}
function paper(c='r'){const o=grid();
 o.r(2,1,14,1,'m').r(8,0,2,3,'r').p(9,3,'r').p(9,4,'r');
 o.r(5,5,8,18,'k').r(6,6,6,16,'w').r(6,19,6,3,'s');
 o.r(7,7,4,4,c).r(7,7,4,1,'R').p(8,8,'p').p(9,9,'w');
 for(let y=12;y<19;y+=2){o.p(7,y,'k').p(7,y+1,'k').p(10,y,'k').p(10,y+1,y%4?'.':'k')}
 return o}


const FIG='..hh../.hhhh./.httt./..tt../.cccc./cccccc/cCccCc/cCccCc/.cccc./.cCCc./.cCCc./.kk.kk';
const fig=(o,x,y,pal,fl)=>{const r=FIG.split('/');if(fl)r.reverse();return o.s(x,y,r.join('/'),pal)};
const bl=(o,x,y,c='p',d='r')=>o.p(x,y,d).p(x-1,y,c).p(x+1,y,c).p(x,y-1,c).p(x,y+1,c);
const BR='.....D.../....DDD../..D..D.D./.DDD.D.DD/..D.DD.D./...DDD.../....kD.../....k..../....k..../....k..../....k..../....k....';
const LF='.GGGG./GggGGG/.GGGG.';
/* 화투 나머지 */
function h2(){const o=base('e');
 o.r(2,15,10,1,'m').r(3,16,2,1,'m').r(4,10,1,5,'m').r(10,8,1,7,'m').r(5,9,5,1,'m');
 [[4,8],[7,7],[10,6],[13,9],[6,12],[12,12]].forEach(([x,y])=>bl(o,x,y));
 o.s(8,11,'.yyy./yyyyo/yYYy./.k.k.');o.r(2,22,14,2,'E');return o}
function h3(){const o=base('p');
 o.r(2,2,14,5,'r');for(let x=3;x<16;x+=3)o.r(x,2,1,5,'R');o.r(2,7,14,1,'w');
 o.r(8,13,2,9,'m');o.c(6,11,3,'w').c(12,10,3,'w').c(9,14,3,'w');
 [[5,10],[7,12],[11,9],[13,11],[9,13],[10,15],[8,15]].forEach(([x,y])=>o.p(x,y,'p'));
 o.r(2,22,14,2,'g');return o}
function h4(){const o=base('e');o.s(5,9,BR);o.s(11,5,'.sss./ssssy/.sSs.');o.r(2,22,14,2,'g');return o}
function h5(){const o=base('e');
 for(let i=0;i<=12;i++){const x=8-Math.round(i*5/12),y=22-i;o.p(x,y,'G').p(x+1,y,'g')}
 for(let i=0;i<=10;i++){const x=8+Math.round(i*6/10),y=22-i;o.p(x,y,'G').p(x-1,y,'g')}
 o.r(9,9,1,13,'G');o.c(9,7,2,'v').p(9,7,'y').p(8,6,'w');o.c(12,10,1,'v').p(12,10,'y');o.c(6,11,1,'v').p(6,11,'y');
 o.r(2,22,14,2,'E');return o}
function h7(){const o=base('e');o.s(4,6,BR,{D:'r'});o.s(7,18,'.nnnnnk./nnnnnnnn/.n.nn.n./.m.mm.m.');o.r(2,22,14,2,'g');return o}
function h9(){const o=base('e');
 o.s(3,15,LF).s(10,15,LF);
 o.c(9,9,5,'Y').c(9,9,4,'y').c(9,9,2,'o').p(9,9,'Y');
 for(let a=0;a<8;a++)o.p(9+Math.round(Math.cos(a*.785)*5),9+Math.round(Math.sin(a*.785)*5),'o');
 o.s(6,19,'rrrrrrr/.rrrrr./..rrr..').r(6,19,7,1,'y');o.r(2,22,14,2,'E');return o}
function h11(){const o=base('e');
 o.r(8,7,1,6,'m');o.s(6,3,'.v.v./vvvvv/.vvv./..v..');
 o.c(5,13,3,'G').c(12,14,3,'G').c(9,18,3,'g');o.r(5,13,1,5,'D').r(12,14,1,4,'D').r(9,18,1,4,'D');
 o.s(10,8,'.rr../rrrry/.rrYY');o.r(2,22,14,2,'E');return o}
function h12(){const o=base('B');
 for(let x=3;x<16;x+=3)for(let y=3+x%2;y<22;y+=5)o.p(x,y,'b');
 o.c(9,9,5,'r').r(2,10,14,5,'B').r(9,10,1,6,'n');fig(o,6,10,{c:'g',C:'G',h:'k'});o.r(2,22,14,2,'D');return o}
/* 타로 나머지 */
function t1(){const o=base('y','Y');
 o.s(6,3,'.vv.vv./v..v..v/.vv.vv.');fig(o,6,6,{c:'w',C:'s',h:'m'});o.r(12,6,1,6,'n').p(12,5,'w');
 o.r(2,19,14,5,'n').r(2,19,14,1,'m');o.p(4,18,'Y').p(5,18,'Y').r(7,17,1,2,'s').p(7,16,'w').p(10,18,'y').p(11,18,'y').c(13,18,1,'r');return o}
function t2(){const o=base('N','Y');
 o.r(2,3,3,19,'k').r(3,3,1,19,'S').r(13,3,3,19,'w').r(14,3,1,19,'s');
 fig(o,6,7,{c:'b',C:'B',h:'k'});o.c(9,5,1,'w').r(8,13,3,2,'e');o.r(2,22,14,2,'S');return o}
function t3(){const o=base('g','Y');
 [3,5,12,14].forEach(x=>{o.r(x,17,1,5,'Y').p(x,16,'y')});
 fig(o,6,6,{c:'p',C:'r',h:'y'});o.s(7,4,'y.yy/yyyy');o.s(12,11,'r.r/rrr/.r.');o.r(2,22,14,2,'b');return o}
function t4(){const o=base('r','Y');
 o.r(5,5,8,17,'S').r(5,5,1,17,'s');fig(o,6,7,{c:'R',C:'k',h:'w'});o.r(7,10,4,2,'w').s(7,5,'y.yy/yyyy');
 o.r(13,8,1,8,'Y').c(13,7,1,'Y');o.s(2,20,'..n.....n...../.nnn...nnn..../nnnnnnnnnnnnnn');return o}
function t5(){const o=base('v','Y');
 o.r(2,3,2,19,'k').r(14,3,2,19,'k');fig(o,6,7,{c:'r',C:'R',h:'Y'});o.s(7,4,'.yy./yyyy/.yy.');
 o.r(12,8,1,10,'y').r(11,10,3,1,'y');o.s(4,19,'rr..ww/rr..ww');o.r(2,22,14,2,'S');return o}
function t6(){const o=base('b','Y');
 o.c(9,4,2,'y').s(5,4,'ww.....ww/w.......w');o.s(8,7,'r.r/rrr/.r.');
 fig(o,3,10,{c:'v',h:'y'});fig(o,9,10,{c:'G',C:'D',h:'m'});o.r(2,22,14,2,'g');return o}
function t7(){const o=base('b','Y');
 o.r(5,5,8,2,'B').p(7,5,'y').p(10,5,'y').r(5,7,1,7,'n').r(12,7,1,7,'n');o.r(4,14,10,6,'Y').r(4,14,10,1,'y');
 fig(o,6,5,{c:'y',C:'Y',h:'k'});o.c(5,20,2,'k').p(5,20,'s').c(13,20,2,'k').p(13,20,'s');
 o.s(2,22,'ww./www').s(13,22,'.kk/kkk');return o}
function t8(){const o=base('y','Y');
 o.s(5,3,'.vv.vv./v..v..v/.vv.vv.');fig(o,4,7,{c:'w',C:'s',h:'Y'});
 o.c(12,16,3,'Y').c(12,16,2,'o').p(11,15,'k').p(13,15,'k').p(12,17,'r').r(8,18,7,4,'o').r(15,19,1,3,'o');o.r(2,22,14,2,'g');return o}
function t9(){const o=base('N','Y');
 [[4,4],[13,3],[15,8],[3,9]].forEach(([x,y])=>o.p(x,y,'w'));
 o.s(2,17,'....w.......w./...www.....www/..wwwww..wwwww').r(2,20,14,4,'w');
 o.r(4,8,1,14,'n');fig(o,6,6,{c:'s',C:'S',h:'w'});o.r(12,10,3,3,'k').p(13,11,'y');return o}
function t10(){const o=base('v','Y');
 o.c(9,12,6,'Y').c(9,12,5,'e');for(let i=-5;i<=5;i++)o.p(9+i,12+i,'k').p(9+i,12-i,'k');
 o.r(9,7,1,11,'k').r(4,12,11,1,'k');o.c(9,12,1,'r');o.p(3,4,'y').p(14,4,'r').p(3,20,'b').p(14,20,'g');return o}
function t11(){const o=base('E','Y');
 o.r(13,3,1,12,'s').r(12,14,3,1,'Y').p(13,2,'w');fig(o,6,7,{c:'r',C:'R',h:'Y'});o.s(7,5,'y.yy/yyyy');
 o.s(2,10,'.kkk./k.k.k/y...y/yy.yy');o.r(2,22,14,2,'S');return o}
function t12(){const o=base('b','Y');
 o.r(3,3,12,2,'n');[4,7,10,13].forEach(x=>o.p(x,5,'G'));o.r(9,5,1,3,'k');
 o.c(9,19,2,'y');fig(o,6,8,{c:'B',C:'N',h:'y'},1);o.r(2,22,14,2,'g');return o}
function t13(){const o=base('o','Y');
 o.c(9,19,3,'y').r(5,12,9,4,'w').r(12,9,2,4,'w').r(13,8,3,2,'w');[5,8,11,13].forEach(x=>o.r(x,16,1,4,'w'));
 fig(o,7,3,{c:'k',C:'k',h:'k',t:'w'});o.r(4,4,1,9,'n').r(2,4,3,4,'k').p(3,5,'w');o.r(2,22,14,2,'D');return o}
function t14(){const o=base('b','Y');
 o.s(2,7,'.ww/www/ww.').s(12,7,'ww./www/.ww');fig(o,6,6,{c:'w',C:'s',h:'y'});
 o.s(4,15,'yyy/.y.').s(11,15,'yyy/.y.');o.r(6,16,4,1,'b').r(8,17,2,3,'b');
 o.s(5,20,'..E../.EEE./EEEEE').r(2,22,14,2,'g');return o}
function t15(){const o=base('k','Y');
 o.p(9,3,'y').r(8,4,3,1,'y');fig(o,6,6,{c:'R',C:'k',h:'k',t:'r'});o.s(7,4,'w..w/w..w');
 o.r(5,16,1,3,'s').r(12,16,1,3,'s');o.s(3,19,'.rr./rrrr').s(11,19,'.bb./bbbb');o.r(2,22,14,2,'m');return o}
function t16(){const o=base('k','Y');
 o.r(5,9,8,13,'S').r(5,9,1,13,'s');for(let y=10;y<22;y+=2)o.r(6,y,6,1,'s');
 o.r(5,6,8,3,'Y').p(6,5,'Y').p(11,5,'Y');o.s(8,2,'.yy/yy./.yy/yy./.y.');
 [[7,12],[10,12],[7,16],[10,16]].forEach(([x,y])=>o.p(x,y,'y'));o.p(7,11,'o').p(10,15,'o').p(7,15,'r');
 o.s(2,10,'t.t/.r.').s(13,13,'t.t/.b.');o.r(2,22,14,2,'m');return o}
function t20(){const o=base('b','Y');
 o.r(2,21,14,3,'B');o.s(2,6,'.ww/www/ww.');fig(o,6,3,{c:'w',C:'s',h:'y'});
 o.r(10,5,5,1,'Y').p(15,4,'Y').p(15,6,'Y');o.r(12,7,3,3,'w').r(13,7,1,3,'r').r(12,8,3,1,'r');
 o.r(3,18,4,3,'S').r(11,18,4,3,'S');o.s(4,15,'t.t/ttt/.w.').s(12,15,'t.t/ttt/.w.');return o}
function t21(){const o=base('b','Y');
 o.c(9,13,6,'G').c(9,13,5,'b');[[4,10],[14,10],[4,16],[14,16],[6,8],[12,8],[6,18],[12,18]].forEach(([x,y])=>o.p(x,y,'g'));
 o.r(8,6,2,1,'r').r(8,20,2,1,'r');fig(o,6,8,{c:'v',C:'v',h:'y'});
 o.r(3,3,2,2,'y').r(13,3,2,2,'r').r(3,20,2,2,'w').r(13,20,2,2,'o');return o}
function omiFaceArt(){const o=base('e','Y');o.r(8,3,2,20,'n').r(8,3,2,4,'r');for(let y=9;y<21;y+=3)o.p(9,y,'k');return o}
const HWF=[songhak,h2,h3,h4,h5,moran,h7,gongsan,h9,danpung,h11,h12];
const TAF=[fool,t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13,t14,t15,t16,star,moon,sun,t20,t21];
const C={},mk=(k,f,z)=>C[k+'_'+z]||(C[k+'_'+z]=cardSvg(f(),z));

export const hwatu = (i, z) => mk('h' + i, HWF[i], z)
export const tarot = (i, z) => mk('t' + i, TAF[i], z)
export const hwatuBack = (z) => mk('hb', () => back('R', 'r'), z)
export const tarotBack = (z) => mk('tb', () => back('N', 'B'), z)
export const omiBack = (z) => mk('ob', () => back('r', 'R'), z)
export const omiFace = (z) => mk('of', omiFaceArt, z)
export const omiTong = (z) => mk('ot', tong, z)
export const omiPaper = (t, z) => mk('op' + t, () => paper(['r', 'o', 'S'][t]), z)

/* ───────── 띠 캐릭터 · 아이콘 (원본 app.js) ───────── */
const SP=[['#c9c4d6','r','#f59db8','pe'],['#f4f1e8','r','#7b5b45','ox'],['#ffb04d','r','#ffb04d','ti'],['#ffffff','l','#f9b4c8','rb'],['#7ed6a2','n','#7ed6a2','dr'],['#8bd36b','n','#8bd36b','sn'],['#c98a55','p','#c98a55','ho'],['#fafafa','f','#d9c28f','sh'],['#a9744f','r','#a9744f','mk'],['#fffdf4','n','#fffdf4','ck'],['#e3b57a','f','#8a5a35','dg'],['#f9b4c8','p','#f08fae','pg'],['#ffcf5a','r','#c98a55','li'],['#e8e2d0','p','#e8e2d0','gt'],['#ffe0c8','n','#6b3b10','gl']];
const EA={r:[[1,3,2,2],[9,3,2,2]],p:[[2,2,1,2],[3,3,1,1],[9,2,1,2],[8,3,1,1]],l:[[3,0,2,4],[7,0,2,4]],f:[[1,4,1,4],[10,4,1,4]],n:[]};
const EX={pe:[[1,3,1,1,'#f59db8'],[10,3,1,1,'#f59db8'],[5,8,2,1,'#f59db8']],ox:[[1,2,1,2,'#fff3c4'],[10,2,1,2,'#fff3c4'],[4,8,4,2,'#f5b5b5'],[3,5,1,1,'#555'],[8,6,1,1,'#555']],ti:[[5,4,2,1,'#6b3b10'],[4,5,1,1,'#6b3b10'],[7,5,1,1,'#6b3b10'],[4,8,4,2,'#fff']],rb:[[3,1,1,2,'#f9b4c8'],[8,1,1,2,'#f9b4c8'],[5,8,2,1,'#f59db8']],dr:[[3,2,1,2,'#ffd54a'],[8,2,1,2,'#ffd54a'],[4,8,1,1,'#2e7d32'],[7,8,1,1,'#2e7d32']],sn:[[5,10,1,2,'#e53935'],[3,5,1,1,'#2e7d32'],[8,5,1,1,'#2e7d32']],ho:[[5,2,2,2,'#6d4c41'],[4,8,4,2,'#d7b899']],sh:[[1,5,1,2,'#d9c28f'],[10,5,1,2,'#d9c28f'],[3,8,6,2,'#e6d9c0']],mk:[[3,6,6,4,'#f3d3b0']],ck:[[5,2,2,2,'#e53935'],[5,8,2,2,'#ffb300'],[6,10,1,1,'#e53935']],dg:[[4,8,4,2,'#f1d9b5'],[5,8,2,1,'#333']],pg:[[4,8,4,3,'#f08fae'],[5,9,1,1,'#7a3350'],[6,9,1,1,'#7a3350']],li:[[1,3,10,1,'#c98a55'],[1,4,1,7,'#c98a55'],[10,4,1,7,'#c98a55'],[2,11,8,1,'#c98a55'],[5,8,2,1,'#e8506e']],gt:[[2,1,1,2,'#8a7a5a'],[9,1,1,2,'#8a7a5a'],[5,11,2,1,'#ffffff']],gl:[[2,3,8,2,'#6b3b10'],[2,5,1,5,'#6b3b10'],[9,5,1,5,'#6b3b10'],[8,3,2,1,'#ff8fb8'],[3,8,1,1,'#ffb3cf'],[8,8,1,1,'#ffb3cf']]};
const spr=(t,z=64)=>{const[c,e,ec,x]=SP[t],o=[],Q=(a,b,w,h,f)=>o.push(`<rect x=${a} y=${b} width=${w} height=${h} fill="${f}"/>`);
  EA[e].forEach(a=>Q(...a,ec));Q(3,4,6,1,c);Q(2,5,8,5,c);Q(3,10,6,1,c);EX[x].forEach(a=>Q(...a));Q(4,7,1,1,'#222');Q(7,7,1,1,'#222');
  return`<svg viewBox="0 0 12 12" width=${z} height=${z} shape-rendering=crispEdges>${o.join('')}</svg>`};
/* 도트 이미지: 문자 지도를 SVG로 그린다 */
const PAL={k:'#3a2e5c',w:'#ffffff',r:'#e8506e',p:'#ffb3cf',y:'#ffd75e',g:'#8bd36b',G:'#2e8b57',b:'#6fb3ff',o:'#ff9f4a',n:'#8a5a35',v:'#a98be8',e:'#efe6d0',s:'#cfc9e0',A:'#ff8fb8',B:'#ffd75e'};
const px=(m,p={},z=48)=>{let o='';m.forEach((r,y)=>{for(let x=0;x<r.length;){const c=r[x];let n=1;while(r[x+n]==c)n++;if(c!='.')o+=`<rect x=${x} y=${y} width=${n} height=1 fill="${p[c]||PAL[c]||c}"/>`;x+=n}});return`<svg viewBox="0 0 ${m[0].length} ${m.length}" width=${z} height=${Math.round(z*m.length/m[0].length)} shape-rendering=crispEdges>${o}</svg>`};
const MP=Object.fromEntries(Object.entries({
pine:'....GG..rr/...GGGG.rr/..GGGGGG../...GGGG.../..GGGGGG../.GGGGGGGG./....nn..../....nn..../...nnnn.../..........',
flower:'...AAAA.../..AAAAAA../.AAABBAAA./.AAABBAAA./..AAAAAA../...AAAA.../....GG..../..G.GG.G../...GGGG.../....GG....',
bush:'.....A..../....AA.A../..A.A.AA../.AA.AA.A../..AAAA.AA./...AAAA.../....GG..../....GG..../....GG..../....GG....',
moon:'........../...yyyy.../..yyyyyy../..yyyyyy../..yyyyyy../...yyyy.../........../.kkkkkkkk./kkkkkkkkkk/kkkkkkkkkk',
maple:'....AA..../...AAAA.../.AAAAAAAA./..AAAAAA../.AAAAAAAA./..AAAAAA../...AAAA.../....nn..../....nn..../..........',
paul:'..AAAA..../.AAAAAA.../..AAAA..../....n...../..GGGGGG../.GGGGGGGG./.GGGGGGGG./..GGGGGG../....nn..../....nn....',
rain:'...AAAA.../..AAAAAA../.AAAAAAAA./AAAAAAAAAA/....nn..../....nn..../.b..nn.b../...b..b.../.b..b..b../..........',
sun:'....y..../.y..y..y./..yyyyy../.yyyyyyy./yyyyyyyyy/.yyyyyyy./..yyyyy../.y..y..y./....y....',
cmoon:'..yyyyy../.yyy...../yyy....../yyy....../yyy....../yyy....../yyyy...../.yyyyyyy./..yyyyy..',
star:'....y..../....y..../...yyy.../yyyyyyyyy/.yyyyyyy./..yyyyy../..yy.yy../.yy...yy./.y.....y.',
heart:'.rr...rr./rrrr.rrrr/rrrrrrrrr/rrrrrrrrr/.rrrrrrr./..rrrrr../...rrr.../....r..../.........',
wheel:'...kkk.../.kk.k.kk./.k..k..k./k...k...k/kkkkwkkkk/k...k...k/.k..k..k./.kk.k.kk./...kkk...',
skull:'.sssssss./sssssssss/skksssksk/skksssksk/sssskssss/.sssssss./..sksks../..sksks../.........',
tower:'..r.r.r../..rrrrr../...ooo.../...oko.../...ooo.../...oko.../...ooo.../..ooooo../.ooooooo.',
scales:'....k..../kkkkkkkkk/k...k...k/k...k...k/yyy.k.yyy/yyy.k.yyy/....k..../..kkkkk../.........',
crown:'y...y...y/yy.yyy.yy/yyyyyyyyy/yryyyyyry/yyyyyyyyy',
cross:'....y..../....y..../..yyyyy../....y..../....y..../....y..../....y..../....y..../....y....',
cup:'........./yyyyyyyyy/yyyyyyyyy/.yyyyyyy./..yyyyy../...yyy.../....y..../..yyyyy../.........',
wand:'......yy./.....yy../....nn.../...nn..../..nn...../.nn....../nn......./.........',
person:'...nnn.../..nnnnn../..nwnwn../...nnn.../..ppppp../.ppppppp./..ppppp../..pp.pp../..bb.bb..',
eye:'........./..kkkkk../.kwwwwwk./kwwbbbwwk/kwwbkbwwk/kwwbbbwwk/.kwwwwwk./..kkkkk../.........',
jar:'...bbb.../..bbbbb../.bbbbbbb./.bbwwbbb./.bbwbbbb./.bbbbbbb./..bbbbb../...bbb.../..bb.bb..',
fish:'....bbb...../..bbbbbbb..b/.bbwkbbbbbbb/..bbbbbbb..b/....bbb.....',
twin:'.yyyy..bbbb./.yyyy..bbbb./.pkpp..pkpp./.pppp..pppp./..pp....pp../.rrrr..vvvv./.rrrr..vvvv.',
crab:'.rr.....rr./.rrr...rrr./..rrrrrrr../.rrkrrrkrr./..rrrrrrr../.r.r.r.r.r./r..r.r.r..r',
scorp:'........rr../.......r..r./..rrrrr...r./.rrkrrrr.r../..rrrrrrr.../.r.r.r.r....',
bow:'..nn....../.n..n...../n....n..yy/nkkkkkkkyy/n....n..yy/.n..n...../..nn......',
stick:'..n.n.n../..n.n.n../.nnnnnnn./nrrrrrrrn/nrwrwrwrn/nrrrrrrrn/nrwrwrwrn/nrrrrrrrn/nnnnnnnnn',
wave:'.bb...bb./b..b.b..b/...bbb...',
bubble:'.kkkkkkk./kwwwwwwwk/kwkwkwkwk/kwwwwwwwk/.kkkwkkk./...kwk.../....k....',
clover:'.GG...GG./GGGG.GGGG/.GGGGGGG./..GGGGG../.GGGGGGG./GGGG.GGGG/.GG.n.GG./....n..../....n....',
coin:'..kkkkk../.kyyyyyk./kyyoooyyk/kyyoyyyyk/kyyoooyyk/kyyyyyoyk/kyyoooyyk/.kyyyyyk./..kkkkk..',
house:'....r..../...rrr.../..rrrrr../.rrrrrrr./rrrrrrrrr/.eeeeeee./.ewweeke./.eeeekke./.eeeeeee.',
drop:'....b..../....b..../...bbb.../..bbbbb../.bbbbbbb./.bbwbbbb./.bbwbbbb./..bbbbb../...bbb...',
cal:'kkkkkkkkk/krrrrrrrk/kwwwwwwwk/kwkwkwkwk/kwwwwwwwk/kwkwkwkwk/kwwwwwwwk/kkkkkkkkk',
clock:'..kkkkk../.kwwwwwk./kwwwkwwwk/kwwwkwwwk/kwwwkkkwk/kwwwwwwwk/.kwwwwwk./..kkkkk..',
pen:'......kk./.....kyk./....kyk../...kyk.../..kyk..../.kwk...../kk.......'
}).map(([k,v])=>[k,v.split('/')]));

const pxi=(k,z,p)=>px(MP[k],p,z);

/** 띠 캐릭터 (0=쥐 … 11=돼지). 12~14 는 별자리용 추가 캐릭터 */
export const animal = (i, z = 64) => spr(i, z)
/** 이름으로 고른 도트 그림 */
export const pixel = (key, z = 40, pal) => px(MP[key], pal, z)
