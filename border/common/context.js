class Context {
    static create(canvas) {
        let context = new Context();

        let gl = canvas.getContext("webgl", {
            antialias: false
        });
        if (!gl) {
            throw new Error("Could not initialise WebGL");
        }

        if (!gl.getExtension('OES_standard_derivatives')) {
            throw new Error("gl isn't support OES_standard_derivatives");
        }

        context.gl = gl;

        ProgramManager.getInstance().setGL(gl);

        context.initGLState(context.gl);

        context.vpWidth = canvas.width;
        context.vpHeight = canvas.height;

        context.camera = Camera.create(context.vpWidth, context.vpHeight);

        return context;
    }

    constructor() {
        this.gl = null;
        this.vpWidth = 0;
        this.vpHeight = 0;

        this.camera = null;
        this.meshes = [];
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
    }

    draw() {
        let w = this.vpWidth;
        let h = this.vpHeight;

        let gl = this.gl;

        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let mesh of this.meshes) {
            mesh.draw(this.camera);
        }
    }

    initGLState(gl) {
        gl.clearColor(1.0, 0.0, 0.0, 1.0);
        
        gl.disable(gl.DEPTH_TEST);
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
}