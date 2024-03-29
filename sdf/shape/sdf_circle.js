class SdfCircle {
    static create(gl, r) {
        let aVertexPosition = [
            ...[-r, -r],
            ...[-r, r],
            ...[r, r],
            ...[r, -r],
        ];

        let indices = [0, 1, 2, 0, 2, 3];

        let e = new SdfCircle(gl);
        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_circle.fs");

        let material = SdfCircleMaterial.create(gl, program);
        material.setRadius(r);
        material.setVertexScale(0, 0, 1, 1);

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

class SdfCircleMaterial {
    static create(gl, program) {
        return new SdfCircleMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        // AA半径，对正常物体是 0.5，对 阴影是 阴影半径
        this.uAARadius = 0.5;

        // 半径
        this.uRadius = 1.0;
        // obj 放大到 矩阵 的 缩放系数 (x, y, w, h)
        this.uVertexScale = [0.0, 0.0, 1.0, 1.0];

        this.uWorld = mat4.create();
        mat4.identity(this.uWorld);
    }

    setWorldMatrix(m) {
        this.uWorld = m;
    }

    setColor(r, g, b, a) {
        this.uColor = [r, g, b, a];
    }

    setVertexScale(x, y, w, h) {
        this.uVertexScale = [x, y, w, h];
    }

    setAARadius(r) {
        this.uAARadius = r;
    }

    setRadius(r) {
        this.uRadius = r;
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

        let uRadius = program.getUniform("uRadius");
        gl.uniform1f(uRadius, this.uRadius);

        let uAARadius = program.getUniform("uAARadius");
        gl.uniform1f(uAARadius, this.uAARadius);

        // 因为 四边形的坐标用的是 [-0.5, 0.5]，需要扩大 那么多倍 去匹配
        let uVertexScale = program.getUniform("uVertexScale");
        gl.uniform4f(uVertexScale, ...this.uVertexScale);
    }
}