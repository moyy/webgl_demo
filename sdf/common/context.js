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
        context.canvas = canvas;
        context.camera = Camera.create();
        
        context.setSize(gl);
        ProgramManager.getInstance().setGL(gl);

        context.initGLState(context.gl);

        return context;
    }

    constructor() {
        this.gl = null;
        
        this.canvas = null;

        this.camera = null;
        this.meshes = [];
    }

    addMesh(mesh) {
        this.meshes.push(mesh);
    }

    setSize(gl) {
        let ratio = window.devicePixelRatio;
        let w = Math.round(ratio * this.canvas.clientWidth);
        let h = Math.round(ratio * this.canvas.clientHeight);

        if (w !== this.canvas.width || h !== this.canvas.height) {
            this.canvas.width = w;
            this.canvas.height = h;
            console.warn("========= canvas resize = (" + w + ", " + h + ")");
        }

        this.camera.setSize(w, h);
        
        gl.viewport(0, 0, w, h);
        gl.scissor(0, 0, w, h);
    }

    draw() {
        let gl = this.gl;
        
        this.setSize(gl);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let mesh of this.meshes) {
            mesh.draw(this.camera);
        }
    }

    initGLState(gl) {
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        
        gl.disable(gl.DEPTH_TEST);
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
}