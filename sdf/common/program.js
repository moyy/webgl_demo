// Shader 管理器
class ProgramManager {

    static _instance = null;

    static getInstance() {
        if (!ProgramManager._instance) {
            ProgramManager._instance = new ProgramManager();
        }
        return ProgramManager._instance;
    }

    constructor() {
        this.gl = null;
        // key = string, value = string
        this.sourceMap = new Map();

        // key = string, value = class Program
        this.programMap = new Map();
    }

    setGL(gl) {
        this.gl = gl;
    }

    addShader(key, source) {
        this.sourceMap.set(key, source);
    }

    // return class Program
    getProgram(vsKey, fsKey) {
        const key = `${vsKey}:${fsKey}`;
        let program = this.programMap.get(key);
        if (!program) {
            program = this._createProgram(vsKey, fsKey);
        }
        this.programMap.set(key, program);
        return program;
    }

    _createProgram(vsKey, fsKey) {
        let gl = this.gl;
        let vsSource = this.sourceMap.get(vsKey);
        let fsSource = this.sourceMap.get(fsKey);

        let vs = this._createShader(this.gl.VERTEX_SHADER, vsSource);
        let fs = this._createShader(this.gl.FRAGMENT_SHADER, fsSource);

        let id = gl.createProgram();
        gl.attachShader(id, vs);
        gl.attachShader(id, fs);
        gl.linkProgram(id);

        if (!gl.getProgramParameter(id, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(id));
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);

        return new Program(gl, id);
    }

    _createShader(type, source) {
        let gl = this.gl;

        let shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }
}

class Program {
    constructor(gl, id) {
        this.id = id;
        this.gl = gl;

        // key = string, value = UniformLocation
        this.uniforms = new Map();

        // key = string, value = AttribteLocation
        this.attributes = new Map();
    }

    getUniform(name) {
        let gl = this.gl;
        let u = this.uniforms.get(name);
        if (!u) {
            u = gl.getUniformLocation(this.id, name);
            this.uniforms.set(name, u);
        }
        return u;
    }

    getAttribute(name) {
        let gl = this.gl;

        let a = this.attributes.get(name);
        if (!a) {
            a = gl.getAttribLocation(this.id, name)
            this.attributes.set(name, a);
        }
        return a;
    }
}