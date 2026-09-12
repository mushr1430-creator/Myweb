// The homepage's addBg shader: identical noise, grain, gray range and flow speeds.
// Run after OutputPass so the gray values match the homepage's direct shader output.
export const HOME_BACKGROUND_FRAGMENT = `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform vec2 viewport;
  varying vec2 vUv;

  float rand(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float ns(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
      mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
      mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
  }

  float galleryOpacity(float edgeDistance) {
    // Preserve the gallery's existing top/bottom fade, revealing the background.
    float fadeHeight = clamp(viewport.y * 0.24, 150.0, 280.0);
    float position = clamp(edgeDistance / fadeHeight, 0.0, 1.0);
    if (position < 0.18) return mix(0.0, 0.04, position / 0.18);
    if (position < 0.56) return mix(0.04, 0.38, (position - 0.18) / 0.38);
    return mix(0.38, 1.0, (position - 0.56) / 0.44);
  }

  void main() {
    vec2 uv = vUv;
    float d1 = distance(uv, vec2(0.5, 0.5));
    float d2 = distance(uv, vec2(0.0, 1.0));
    float gr = mix(-0.2, 0.2, rand(uv + sin(time)));
    vec2 mv = vec2(time * 0.05, time * -0.05);
    float f = ns((uv * d1 * 2.0) + mv);
    f += ns((uv * d2 * 2.5) + vec2(time * -0.075, time * 0.05));
    f += gr;
    f = smoothstep(0.0, 2.0, f);
    vec3 background = mix(vec3(0.0), vec3(0.3), f);

    vec4 gallery = texture2D(tDiffuse, vUv);
    float edgeDistance = min(vUv.y, 1.0 - vUv.y) * viewport.y;
    float opacity = gallery.a * galleryOpacity(edgeDistance);
    gl_FragColor = vec4(mix(background, gallery.rgb, opacity), 1.0);
  }
`;
