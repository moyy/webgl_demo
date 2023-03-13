/**
 * 圆弧
 */
class SdfArc {
    // halfWidth 弧-半宽
    // isFlat 弧-端点 是否 平直
    // radArc 半角
    // radAxis 轴和 x-正向 的 角度，正 代表 顺时针
    static create(gl, r, halfWidth, isFlat, radArc, radAxis) {
        let e = new SdfArc(gl);

        let size = r + halfWidth;
        let aVertexPosition = [
            ...[-size, -size],
            ...[-size, size],
            ...[size, size],
            ...[size, -size],
        ];

        let indices = [0, 1, 2, 0, 2, 3];
        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_arc.fs");

        let material = SdfArcMaterial.create(gl, program);
        material.setInfo(
            0, 0, 1, 1,
            Math.sin(radAxis), Math.cos(radAxis),
            Math.sin(radArc), Math.cos(radArc),
            r, halfWidth, isFlat
        );
        e.mesh = Mesh.create(gl);

        e.mesh.setMaterial(material);
        e.mesh.setIndices(indices);

        e.mesh.addAttribute("aVertexPosition", 2, aVertexPosition);

        return e;
    }

    constructor(gl) {
        this.gl = gl;
        this.mesh = null;
    }

    draw(camera) {
        this.mesh.draw(camera);
    }
}

class SdfArcMaterial {
    static create(gl, program) {
        return new SdfArcMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];
        
        // AA半径，对正常物体是 0.5，对 阴影是 阴影半径
        this.uAARadius = 0.5;
        
        this.uArcSdf = [
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0
        ];

        this.uWorld = mat4.create();
        mat4.identity(this.uWorld);
    }

    setWorldMatrix(m) {
        this.uWorld = m;
    }

    setColor(r, g, b, a) {
        this.uColor = [r, g, b, a];
    }

    setInfo(
        offset_x, offset_y,
        scale_x, scale_y,
        cosAxis, sinAxis,
        cosArc, sinArc,
        r, halfWidth, isFlat
    ) {
        this.uArcSdf = new Float32Array([
            offset_x, offset_y, scale_x, scale_y,
            cosAxis, sinAxis, cosArc, sinArc,
            r, halfWidth, isFlat ? 1.0 : 0.0, 0,
            0, 0, 0, 0,
        ]);
    }

    use(camera) {
        let gl = this.gl;
        let program = this.program;

        gl.useProgram(this.program.id);

        let uWorld = program.getUniform("uWorld");
        gl.uniformMatrix4fv(uWorld, false, this.uWorld);

        let uView = program.getUniform("uView");
        gl.uniformMatrix4fv(uView, false, camera.uView);

        let uProj = program.getUniform("uProj");
        gl.uniformMatrix4fv(uProj, false, camera.uProj);

        let uColor = program.getUniform("uColor");
        gl.uniform4f(uColor, ...this.uColor);

        let uAARadius = program.getUniform("uAARadius");
        gl.uniform1f(uAARadius, this.uAARadius);

        let uArcSdf = program.getUniform("uArcSdf");
        gl.uniformMatrix4fv(uArcSdf, false, this.uArcSdf);
    }
}