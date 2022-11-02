class SdfEllipse {
    // padding 填充，填充一定 像素，避免 边缘抗锯齿
    static create(gl, a, b, padding) {

        if (typeof padding !== typeof 0) {
            padding = 3;
        }

        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_ellipse.fs");

        let e = new SdfEllipse(gl, program);
        e.material.setEllipseAB(a, b);
        e.material.setVertexScale(0, 0, 2 * a + padding, 2 * b + padding);

        e.vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, e.vbo.id);
        let vertices = [
            -0.5, -0.5,
            0.5, -0.5,
            0.5, 0.5,
            -0.5, 0.5,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        e.vbo.itemSize = 2;
        e.vbo.numItems = 4;

        e.ibo.id = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, e.ibo.id);
        let cubeVertexIndices = [0, 1, 2, 0, 2, 3];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
        e.ibo.itemSize = 1;
        e.ibo.numItems = 6;

        return e;
    }

    constructor(gl, program) {
        this.gl = gl;

        this.material = new SdfEllipseMaterial(gl, program);

        this.vbo = {
            id: null,
            itemSize: null,
            numItems: null,
        };

        this.ibo = {
            id: null,
            itemSize: null,
            numItems: null,
        };
    }

    draw(camera) {
        let gl = this.gl;

        this.material.use(camera);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo.id);
        let aVertexPosition = this.material.program.getAttribute("aVertexPosition");
        gl.vertexAttribPointer(
            aVertexPosition,
            this.vbo.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(aVertexPosition);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.id);
        gl.drawElements(gl.TRIANGLES, this.ibo.numItems, gl.UNSIGNED_SHORT, 0);
    }
}

class SdfEllipseMaterial {
    static create(gl, program) {
        return new SdfEllipseMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        // 椭圆 半长轴，半短轴
        this.uEllipseAB = [1.0, 1.0];
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

    setEllipseAB(a, b) {
        this.uEllipseAB = [a, b];
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

        let uEllipseAB = program.getUniform("uEllipseAB");
        gl.uniform2f(uEllipseAB, ...this.uEllipseAB);

        // 因为 四边形的坐标用的是 [-0.5, 0.5]，需要扩大 那么多倍 去匹配
        let uVertexScale = program.getUniform("uVertexScale");
        gl.uniform4f(uVertexScale, ...this.uVertexScale);
    }
}