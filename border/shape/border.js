/**
 * 边框：（以 左上角为例）
 * 
 * 给定 上边 和 左边 的 宽度，比如 上边宽 10，左边宽 5
 * 
 * 给个 外椭圆 半径，比如 (a, b) = (20, 20)
 * 
 * 那 边框就是 两个 同心椭圆 之间的 部分
 * 
 * 椭圆 中心 (20, 20)，内椭圆的 (a, b) = (15, 10), 外椭圆 (a, b) = (20, 20)
 * 
 */
class SdfBorderConner {
    static create(gl, count, w, h, isLeft, isTop, smallWH) {
        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_border_conner.fs");

        let e = new SdfBorderConner(gl, count, program);
        e.material.setEllipseAB(...smallWH, w, h);

        let x = isLeft ? -w / 2 : w / 2;
        let y = isTop ? -h / 2 : h / 2;
        e.material.setVertexScale(x, y, w, h);

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

    constructor(gl, count, program) {
        this.gl = gl;
        this.count = count;
        this.material = new SdfBorderConnerMaterial(gl, program);

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
        
        for (let i = 0; i < this.count; ++i) {
            gl.drawElements(gl.TRIANGLES, this.ibo.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }
}

class SdfBorderConnerMaterial {
    static create(gl, program) {
        return new SdfBorderConnerMaterial(gl, program);
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

    setEllipseAB(smallA, smallB, bigA, bigB) {
        this.uEllipseAB = [smallA, smallB, bigA, bigB];
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
        gl.uniform4f(uEllipseAB, ...this.uEllipseAB);

        // 因为 四边形的坐标用的是 [-0.5, 0.5]，需要扩大 那么多倍 去匹配
        let uVertexScale = program.getUniform("uVertexScale");
        gl.uniform4f(uVertexScale, ...this.uVertexScale);
    }
}