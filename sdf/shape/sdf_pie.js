/**
 * 扇形
 */
class SdfPie {

    // radPie 半角
    // radAxis 轴和 x-正向 的 角度，正 代表 顺时针
    static create(gl, r, radPie, radAxis) {
        let e = new SdfPie(gl);

        let aVertexPosition = [
            ...[-r, -r],
            ...[-r, r],
            ...[r, r],
            ...[r, -r],
        ];

        let indices = [0, 1, 2, 0, 2, 3];

        let program = ProgramManager.getInstance().getProgram("sdf.vs", "sdf_pie.fs");

        let material = SdfPieMaterial.create(gl, program);
        material.setInfo(
            0, 0, 1, 1,
            Math.sin(radAxis), Math.cos(radAxis),
            Math.sin(radPie), Math.cos(radPie),
            r,
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

class SdfPieMaterial {
    static create(gl, program) {
        return new SdfPieMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        this.uPieSdf = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

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
        cosPie, sinPie,
        r) {
        this.uPieSdf = new Float32Array([
            offset_x, offset_y, scale_x,
            scale_y, cosAxis, sinAxis,
            cosPie, sinPie, r
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

        let uPieSdf = program.getUniform("uPieSdf");
        gl.uniformMatrix3fv(uPieSdf, false, this.uPieSdf);
    }
}