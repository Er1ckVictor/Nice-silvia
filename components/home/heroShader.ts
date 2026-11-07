/* Shader do hero: foto em tela cheia que vira arco, troca líquida entre fotos, fundo desfocado da própria foto */
export const HERO_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTexA; uniform sampler2D uTexB;
uniform vec2 uSizeA; uniform vec2 uSizeB; uniform vec2 uRes; uniform vec2 uMouse;
uniform vec4 uRect; uniform vec2 uRad;
uniform float uMix, uTime, uVel, uShade, uFinal, uReveal, uZoom, uMorph, uDpr, uMouseOn;
uniform vec3 uBg;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+7.1;a*=.5;}return v;}
// recorte "cover" da foto dentro de uma caixa
vec2 cover(vec2 uv, vec2 box, vec2 img, float zoom){
  float rb=box.x/box.y, ri=img.x/img.y;
  vec2 s = rb>ri ? vec2(1., ri/rb) : vec2(rb/ri, 1.);
  return (uv-.5)*s/zoom+.5;
}
// caixa com cantos arredondados (forma do arco)
float sdRB(vec2 p, vec2 b, vec4 r){
  r.xy=(p.x>0.)?r.xy:r.zw; r.x=(p.y>0.)?r.x:r.y;
  vec2 q=abs(p)-b+r.x; return min(max(q.x,q.y),0.)+length(max(q,0.))-r.x;
}
vec3 rgb(sampler2D t, vec2 uv, float s){
  return vec3(texture2D(t,uv+vec2(0.,s)).r, texture2D(t,uv).g, texture2D(t,uv-vec2(0.,s)).b);
}
void main(){
  vec2 fc=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  vec2 c=uRect.xy+uRect.zw*.5;
  vec2 p=fc-c; p.y=-p.y;
  float sd=sdRB(p, uRect.zw*.5, vec4(uRad.x,uRad.y,uRad.x,uRad.y));
  vec2 l=(fc-uRect.xy)/uRect.zw;

  // lente suave sob o mouse
  vec2 md=fc-uMouse; float ml=smoothstep(260.*uDpr,0.,length(md))*uMouseOn;
  l-=md/uRect.zw*ml*.05;

  // transição líquida de baixo para cima com borda dourada
  float n=fbm(l*vec2(2.6,3.4)+vec2(0.,uTime*.06));
  float d=(1.-l.y)+(n-.5)*.5;
  float t=uMix*1.5-.25;
  float rev=smoothstep(d-.035,d+.035,t);
  float band=1.-smoothstep(0.,.06,abs(t-d));
  float live=step(.0005,uMix)*step(uMix,.9995);
  float edge=band*live;
  vec2 la=vec2(l.x+(n-.5)*.03*edge, l.y+uMix*.14);
  vec2 lb=vec2(l.x+(n-.5)*.03*edge, l.y-(1.-uMix)*.06);
  float breath=1.+.015*sin(uTime*.35);
  vec2 ua=cover(vec2(la.x,1.-la.y),uRect.zw,uSizeA,uZoom*breath*(1.+uMix*.1));
  vec2 ub=cover(vec2(lb.x,1.-lb.y),uRect.zw,uSizeB,uZoom*breath*(1.28-.28*uMix));
  float sh=clamp(uVel,-1.5,1.5)*.008+edge*.006;
  vec3 img=mix(rgb(uTexA,ua,sh), rgb(uTexB,ub,sh), rev);
  img+=vec3(.98,.80,.46)*edge*.85*smoothstep(.2,0.,abs(t-d)-.0);

  // sombras para leitura do texto
  float shade=(1.-smoothstep(0.,.72,l.x))*.75+smoothstep(.5,1.,l.y)*.55;
  img*=1.-uShade*clamp(shade,0.,.86);
  float fr=length((l-.5)*vec2(1.,.85));
  img*=1.-uFinal*(.5+.42*smoothstep(.05,.65,fr));

  // fundo: a própria foto, muito desfocada (adapta a cor a cada cena)
  vec2 bl=fc/uRes;
  vec2 ba=cover(vec2(bl.x,1.-bl.y),uRes,uSizeA,1.15);
  vec2 bb=cover(vec2(bl.x,1.-bl.y),uRes,uSizeB,1.15);
  vec3 bg=mix(textureLod(uTexA,ba,7.).rgb, textureLod(uTexB,bb,7.).rgb, smoothstep(.2,.8,uMix));
  bg=mix(bg*.62,uBg,.22);
  bg*=1.-.55*length(bl-vec2(.62,.5));
  bg*=1.-.5*(1.-smoothstep(0.,.6,bl.x))*uMorph;
  bg*=1.-.6*exp(-max(sd,0.)/(70.*uDpr))*uMorph;

  float a=1.-smoothstep(-1.2*uDpr,1.2*uDpr,sd);
  vec3 col=mix(bg,img,a);
  col+=vec3(.95,.8,.5)*(1.-smoothstep(0.,1.6*uDpr,abs(sd)))*.55*uMorph;

  // revelação inicial: tinta que se abre do centro
  vec2 rc=(fc-uRes*.5)/uRes.y;
  float rr=length(rc)+(fbm(rc*3.5+uTime*.15)-.5)*.22;
  float R=uReveal*1.25;
  float vis=1.-smoothstep(R-.07,R,rr);
  col=mix(uBg,col,vis);
  col+=vec3(.96,.8,.5)*(1.-smoothstep(0.,.025,abs(rr-R+.03)))*step(.001,uReveal)*step(uReveal,.999)*.8;

  col+=(hash(fc*.5+fract(uTime*7.))-.5)*.045;
  gl_FragColor=vec4(col,1.);
}
`;
