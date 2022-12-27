ProgramManager.getInstance().addShader("glyphy.fs", `

	#extension GL_OES_standard_derivatives : enable

	precision highp float;

	uniform sampler2D u_atlas_tex;

	// tex_w, tex_h, item_w, item_h_q
	uniform ivec4 u_atlas_info;

	#define GLYPHY_TEXTURE1D_EXTRA_DECLS , sampler2D _tex, ivec4 _atlas_info, ivec2 _atlas_pos
	#define GLYPHY_TEXTURE1D_EXTRA_ARGS , _tex, _atlas_info, _atlas_pos

	vec4 glyphy_texture1D_func(
		int offset, 
		sampler2D _tex, 
		ivec4 _atlas_info, 
		ivec2 _atlas_pos)
	{
		ivec2 item_geom = _atlas_info.zw;
		vec2 pos = (vec2(_atlas_pos.xy * item_geom + ivec2(mod(float(offset), float(item_geom.x)), offset / item_geom.x)) + vec2(.5, .5)) / vec2(_atlas_info.xy);

		return texture2D(_tex, pos);
	}

	#ifndef GLYPHY_INFINITY
		#  define GLYPHY_INFINITY 1e9
	#endif

	#ifndef GLYPHY_EPSILON
		#  define GLYPHY_EPSILON  1e-5
	#endif

	#ifndef GLYPHY_RGBA
	#  ifdef GLYPHY_BGRA
		#    define GLYPHY_RGBA(v) glyphy_bgra (v)
	#  else
		#    define GLYPHY_RGBA(v) glyphy_rgba (v)
	#  endif
	#endif

	vec4 glyphy_rgba(const vec4 v) {
		return v.rgba;
	}

	vec4 glyphy_bgra(const vec4 v) {
		return v.bgra;
	}

	struct glyphy_arc_t {
		vec2 p0;
		vec2 p1;
		float d;
	};

	struct glyphy_arc_endpoint_t {
		/* Second arc endpoint */
		vec2 p;

		/* Infinity if this endpoint does not form an arc with the previous
		* endpoint.  Ie. a \move_to\.  Test with glyphy_isinf().
		* Arc depth otherwise.  */
		float d;
	};

	struct glyphy_arc_list_t {
		/* Number of endpoints in the list.
		* Will be zero if we're far away inside or outside, in which case side is set.
		* Will be -1 if this arc-list encodes a single line, in which case line_* are set. */
		int num_endpoints;

		/* If num_endpoints is zero, this specifies whether we are inside (-1)
		* or outside (+1).  Otherwise we're unsure (0). */
		int side;
		/* Offset to the arc-endpoints from the beginning of the glyph blob */
		int offset;

		/* A single line is all we care about.  It's right here. */
		float line_angle;
		float line_distance; /* From nominal glyph center */
	};

	bool glyphy_isinf(const float v) {
		return abs(v) >= GLYPHY_INFINITY * .5;
	}

	bool glyphy_iszero(const float v) {
		return abs(v) <= GLYPHY_EPSILON * 2.;
	}

	vec2 glyphy_ortho(const vec2 v) {
		return vec2(- v.y, v.x);
	}

	int glyphy_float_to_byte(const float v) {
		return int(v * (256. - GLYPHY_EPSILON));
	}

	ivec4 glyphy_vec4_to_bytes(const vec4 v) {
		return ivec4(v * (256. - GLYPHY_EPSILON));
	}

	ivec2 glyphy_float_to_two_nimbles(const float v) {
		int f = glyphy_float_to_byte(v);
		return ivec2(f / 16, int(mod(float(f), 16.)));
	}

	/* returns tan (2 * atan (d)) */
	float glyphy_tan2atan(const float d) {
		return 2. * d / (1. - d * d);
	}

	glyphy_arc_endpoint_t glyphy_arc_endpoint_decode(const vec4 v, const ivec2 nominal_size) {
		vec2 p = (vec2(glyphy_float_to_two_nimbles(v.a)) + v.gb) / 16.;
		float d = v.r;
		if(d == 0.) d = GLYPHY_INFINITY;
		else
			#define GLYPHY_MAX_D .5
				d = float(glyphy_float_to_byte(d) - 128) * GLYPHY_MAX_D / 127.;
			#undef GLYPHY_MAX_D
		
		return glyphy_arc_endpoint_t(p * vec2(nominal_size), d);
	}

	vec2 glyphy_arc_center(const glyphy_arc_t a) {
		return mix(a.p0, a.p1, .5) + glyphy_ortho(a.p1 - a.p0) / (2. * glyphy_tan2atan(a.d));
	}

	bool glyphy_arc_wedge_contains(const glyphy_arc_t a, const vec2 p) {
		float d2 = glyphy_tan2atan(a.d);
		
		return dot(p - a.p0, (a.p1 - a.p0) * mat2(1, d2, - d2, 1)) >= 0. 
			&& dot(p - a.p1, (a.p1 - a.p0) * mat2(1, - d2, d2, 1)) <= 0.;
	}

	float glyphy_arc_wedge_signed_dist_shallow(const glyphy_arc_t a, const vec2 p) {
		vec2 v = normalize(a.p1 - a.p0);
		
		float line_d = dot(p - a.p0, glyphy_ortho(v));

		if(a.d == 0.0) return line_d;

		float d0 = dot((p - a.p0), v);
		if(d0 < 0.0) {
			return sign(line_d) * distance(p, a.p0);
		}

		float d1 = dot((a.p1 - p), v);
		
		if(d1 < 0.0) {
			return sign(line_d) * distance(p, a.p1);
		}

		float r = 2.0 * a.d * (d0 * d1) / (d0 + d1);
		
		if(r * line_d > 0.0) {
			return sign(line_d) * min(abs(line_d + r), min(distance(p, a.p0), distance(p, a.p1)));
		}

		return line_d + r;
	}

	float glyphy_arc_wedge_signed_dist(const glyphy_arc_t a, const vec2 p) {
		
		if( abs(a.d) <= 0.03 ) {
			return glyphy_arc_wedge_signed_dist_shallow(a, p);
		}
		
		vec2 c = glyphy_arc_center(a);
		
		return sign(a.d) * ( distance(a.p0, c) - distance(p, c) );
	}

	float glyphy_arc_extended_dist(const glyphy_arc_t a, const vec2 p) {
		
		/* Note: this doesn't handle points inside the wedge. */
		vec2 m = mix(a.p0, a.p1, 0.5);
		
		float d2 = glyphy_tan2atan(a.d);

		if(dot(p - m, a.p1 - m) < 0.0) {
			return dot(p - a.p0, normalize((a.p1 - a.p0) * mat2(+ d2, - 1.0, + 1.0, + d2)));
		} else {
			return dot(p - a.p1, normalize((a.p1 - a.p0) * mat2(- d2, - 1.0, + 1.0, - d2)));
		}
	}

	int glyphy_arc_list_offset(const vec2 p, const ivec2 nominal_size) {
		
		ivec2 cell = ivec2( clamp(floor(p), vec2(0.0, 0.0), vec2(nominal_size - 1)));
		
		return cell.y * nominal_size.x + cell.x;
	}

	glyphy_arc_list_t glyphy_arc_list_decode(const vec4 v, const ivec2 nominal_size) {
		
		glyphy_arc_list_t l;
		
		ivec4 iv = glyphy_vec4_to_bytes(v);
		
		l.side = 0; /* unsure */
		
		if(iv.r == 0) { /* arc-list encoded */
			l.offset = (iv.g * 256) + iv.b;
			l.num_endpoints = iv.a;
		
			if(l.num_endpoints == 255) {
				l.num_endpoints = 0;
				l.side = - 1;
			} else if(l.num_endpoints == 0) {
				l.side = + 1;
			}
		} else { /* single line encoded */
			l.num_endpoints = - 1;
			
			l.line_distance = float(((iv.r - 128) * 256 + iv.g) - 0x4000) / float(0x1FFF) * max(float(nominal_size.x), float(nominal_size.y));
			
			l.line_angle = float(- ((iv.b * 256 + iv.a) - 0x8000)) / float(0x7FFF) * 3.14159265358979;
		}

		return l;
	}

	#define GLYPHY_SDF_PSEUDO_DISTANCE 1

	#ifndef GLYPHY_TEXTURE1D_FUNC
		#define GLYPHY_TEXTURE1D_FUNC glyphy_texture1D_func
	#endif
	
	#ifndef GLYPHY_TEXTURE1D_EXTRA_DECLS
		#define GLYPHY_TEXTURE1D_EXTRA_DECLS
	#endif
	
	#ifndef GLYPHY_TEXTURE1D_EXTRA_ARGS
		#define GLYPHY_TEXTURE1D_EXTRA_ARGS
	#endif

	#ifndef GLYPHY_SDF_TEXTURE1D_FUNC
		#define GLYPHY_SDF_TEXTURE1D_FUNC GLYPHY_TEXTURE1D_FUNC
	#endif
	
	#ifndef GLYPHY_SDF_TEXTURE1D_EXTRA_DECLS
		#define GLYPHY_SDF_TEXTURE1D_EXTRA_DECLS GLYPHY_TEXTURE1D_EXTRA_DECLS
	#endif
	
	#ifndef GLYPHY_SDF_TEXTURE1D_EXTRA_ARGS
		#define GLYPHY_SDF_TEXTURE1D_EXTRA_ARGS GLYPHY_TEXTURE1D_EXTRA_ARGS
	#endif
	
	#ifndef GLYPHY_SDF_TEXTURE1D
		#define GLYPHY_SDF_TEXTURE1D(offset) GLYPHY_RGBA(GLYPHY_SDF_TEXTURE1D_FUNC (offset GLYPHY_TEXTURE1D_EXTRA_ARGS))
	#endif

	#ifndef GLYPHY_MAX_NUM_ENDPOINTS
		#define GLYPHY_MAX_NUM_ENDPOINTS 32
	#endif

	glyphy_arc_list_t glyphy_arc_list (
		const vec2 p, 
		const ivec2 nominal_size GLYPHY_SDF_TEXTURE1D_EXTRA_DECLS
	) {
		
		int cell_offset = glyphy_arc_list_offset(p, nominal_size);
		
		vec4 arc_list_data = GLYPHY_SDF_TEXTURE1D(cell_offset);
		
		return glyphy_arc_list_decode(arc_list_data, nominal_size);
	}

	float glyphy_sdf(
		const vec2 p,
		const ivec2 nominal_size GLYPHY_SDF_TEXTURE1D_EXTRA_DECLS
	) {
		glyphy_arc_list_t arc_list = glyphy_arc_list(p, nominal_size  GLYPHY_SDF_TEXTURE1D_EXTRA_ARGS);

		/* Short-circuits */
		if (arc_list.num_endpoints == 0) {

			/* far-away cell */
			return GLYPHY_INFINITY * float(arc_list.side);
		}
		
		if (arc_list.num_endpoints == -1) {
			
			/* single-line */
			float angle = arc_list.line_angle;
			
			vec2 n = vec2(cos(angle), sin(angle));
			
			return dot (p - (vec2(nominal_size) * 0.5), n) - arc_list.line_distance;
		}

		float side = float(arc_list.side);

		float min_dist = GLYPHY_INFINITY;
		
		glyphy_arc_t closest_arc;

		glyphy_arc_endpoint_t endpoint = glyphy_arc_endpoint_decode(GLYPHY_SDF_TEXTURE1D(arc_list.offset), nominal_size);
		
		vec2 pp = endpoint.p;

		for (int i = 1; i < GLYPHY_MAX_NUM_ENDPOINTS; i++) {
			
			if (i >= arc_list.num_endpoints) {
				break;
			}
			
			endpoint = glyphy_arc_endpoint_decode(GLYPHY_SDF_TEXTURE1D (arc_list.offset + i), nominal_size);
			glyphy_arc_t a = glyphy_arc_t(pp, endpoint.p, endpoint.d);
			
			if (glyphy_isinf(a.d)) {
				pp = endpoint.p;
				continue;
			}

			if ( glyphy_arc_wedge_contains(a, p) ) {
				float sdist = glyphy_arc_wedge_signed_dist (a, p);
				float udist = abs(sdist) * (1.0 - GLYPHY_EPSILON);
				if (udist <= min_dist) {
					min_dist = udist;
					side = sdist <= 0. ? -1.0 : +1.0;
				}
			} else {
				float udist = min (distance (p, a.p0), distance (p, a.p1));
				
				if (udist < min_dist - GLYPHY_EPSILON) {
					min_dist = udist;
					side = 0.0; /* unsure */
					closest_arc = a;
				} else if (side == 0.0 && udist - min_dist <= GLYPHY_EPSILON) {
					
					/* If this new distance is the same as the current minimum,
						compare extended distances.  Take the sign from the arc
						with larger extended distance. 
					*/
					float old_ext_dist = glyphy_arc_extended_dist (closest_arc, p);
					float new_ext_dist = glyphy_arc_extended_dist (a, p);

					float ext_dist = abs (new_ext_dist) <= abs (old_ext_dist) ?
								old_ext_dist : new_ext_dist;

					#ifdef GLYPHY_SDF_PSEUDO_DISTANCE
						/* For emboldening and stuff: */
						min_dist = abs (ext_dist);
					#endif

					side = sign (ext_dist);
				}
			}
			pp = endpoint.p;
		}

		if (side == 0.0) {
			// Technically speaking this should not happen, but it does.  So try to fix it.
			float ext_dist = glyphy_arc_extended_dist(closest_arc, p);
			side = sign(ext_dist);
		}

		return min_dist * side;
	}

	float glyphy_point_dist (
		const vec2 p, 
		const ivec2 nominal_size GLYPHY_SDF_TEXTURE1D_EXTRA_DECLS
	) {
		glyphy_arc_list_t arc_list = glyphy_arc_list (p, nominal_size  GLYPHY_SDF_TEXTURE1D_EXTRA_ARGS);

		float side = float(arc_list.side);
		float min_dist = GLYPHY_INFINITY;

		if (arc_list.num_endpoints == 0)
			return min_dist;

		glyphy_arc_endpoint_t endpoint;

		for (int i = 0; i < GLYPHY_MAX_NUM_ENDPOINTS; i++) {
			if (i >= arc_list.num_endpoints) {
				break;
			}
		
			endpoint = glyphy_arc_endpoint_decode (GLYPHY_SDF_TEXTURE1D (arc_list.offset + i), nominal_size);
		
			if (glyphy_isinf (endpoint.d)) continue;
		
			min_dist = min (min_dist, distance (p, endpoint.p));
		}
		return min_dist;
	}

	// 颜色
    uniform vec4 uColor;
	
	uniform bool  u_debug;
	uniform bool  u_outline;
	
	uniform float u_contrast;
	uniform float u_gamma_adjust;
	uniform float u_outline_thickness;
	uniform float u_boldness;
	
	varying vec4 v_glyph;
	
	// 1.0 / sqrt(2.0)
	#define SQRT2_2 0.70710678118654757 
	
	// sqrt(2.0)
	#define SQRT2   1.4142135623730951

	struct glyph_info_t {
		ivec2 nominal_size;

		ivec2 atlas_pos;
	};

	glyph_info_t glyph_info_decode(vec4 v)
	{
		glyph_info_t gi;

		gi.nominal_size = (ivec2 (mod (v.zw, 256.)) + 2) / 4;
		
		gi.atlas_pos = ivec2 (v_glyph.zw) / 256;

		return gi;
	}


	// 抗锯齿 1个像素内
	float antialias(float d)
	{
		// 如果 d 在 [-0.5, 0.5] 则 在 [0.0, 1.0]
		return clamp(0.5 - d, 0.0, 1.0);
	}

	void main()
	{
		vec2 p = v_glyph.xy;
		
		glyph_info_t gi = glyph_info_decode(v_glyph);

		float gsdist = glyphy_sdf(p, gi.nominal_size , u_atlas_tex, u_atlas_info, gi.atlas_pos);

		// 默认 u_boldness = 0.0
		gsdist -= u_boldness;

		/* 缩放系数 */
		float scale = length( fwidth(p) ) * SQRT2_2;

		// 默认 u_contrast = 1.0
		float sdist = u_contrast * gsdist / scale;

		vec4 color = uColor;
		
		// 默认 u_debug = false
		if (!u_debug) {
			
			// 默认 u_outline = false
			if (u_outline) {
				sdist = abs(sdist) - u_outline_thickness * 0.5;
			}

			float alpha = antialias(sdist);
			
			// 默认 u_gamma_adjust = 1.0

			if (u_gamma_adjust != 1.0) {
				alpha = pow(alpha, 1.0 / u_gamma_adjust);
			}

			color.a *= alpha;
		} else {
			color = vec4 (0.0, 0.0, 0.0, 0.0);

			// Color the inside of the glyph a light red
			color += vec4 (0.5, 0,0, 0.5) * smoothstep (1.0, -1.0, sdist);

			float udist = abs(sdist);
			float gudist = abs(gsdist);
			
			// Color the outline red
			color += vec4(1.0, 0.0, 0.0, 1.0) * smoothstep(2.0, 1.0, udist);
			
			// Color the distance field in green
			if (!glyphy_isinf(udist))
				color += vec4(0.0, 0.4, 0.0, 0.4 - (abs(gsdist) / max(float(gi.nominal_size.x), float(gi.nominal_size.y))) * 4.0);

			float pdist = glyphy_point_dist(p, gi.nominal_size , u_atlas_tex, u_atlas_info, gi.atlas_pos);
			
			// Color points green
			color = mix(vec4(0.0, 1,0, 0.5), color, smoothstep (0.05, 0.06, pdist));

			glyphy_arc_list_t arc_list = glyphy_arc_list(
				p, 
				gi.nominal_size, 
				u_atlas_tex, 
				u_atlas_info, 
				gi.atlas_pos
			);

			// Color the number of endpoints per cell blue
			color += vec4 (0.0, 0.0, 1.0,0.4) * float(arc_list.num_endpoints) * 32.0 / 255.0;
		}

		gl_FragColor = color;
	}
`);