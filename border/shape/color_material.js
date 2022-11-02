class ColorMaterial {

    static create(gl, program) {
        return new ColorMaterial(gl, program);
    }

    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.uColor = [0.0, 0.0, 1.0, 1.0];

        this.uWorld = mat4.create();
        mat4.identity(this.uWorld);
    }

    setWorldMatrix(m) {
        this.uWorld = m;
    }

    setColor(r, g, b, a) {
        this.uColor = [r, g, b, a];
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
    }
}