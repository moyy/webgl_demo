class Mesh {

    static create(gl) {
        return new Mesh(gl);
    }

    constructor(gl) {
        this.gl = gl;
        this.material = null;
        
        this.drawCount = 1;

        // key = string, value = VBO
        this.vbo = new Map();

        this.ibo = {
            id: gl.createBuffer(),
            numItems: 0,
        };
    }

    setDrawCount(count) {
        this.drawCount = count;
    }

    setMaterial(m) {
        this.material = m;
    }

    addAttribute(name, itemSize, value) {
        let gl = this.gl;
        let vbo = this.vbo.get(name);
        if (!vbo) {
            vbo = {
                id: gl.createBuffer(),
            };
            this.vbo.set(name, vbo);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.STATIC_DRAW);

        vbo.itemSize = itemSize;
        vbo.numItems = value.length / vbo.itemSize;
    }

    setIndices(indices) {
        let gl = this.gl;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.id);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.ibo.numItems = indices.length;
    }

    draw(camera) {
        let gl = this.gl;

        this.material.use(camera);

        for (let [name, {
                id,
                itemSize
            }] of this.vbo) {

            gl.bindBuffer(gl.ARRAY_BUFFER, id);

            let location = this.material.program.getAttribute(name);

            gl.vertexAttribPointer(
                location,
                itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.enableVertexAttribArray(location);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo.id);
        
        for (let i = 0; i < this.drawCount; ++i) {
            gl.drawElements(gl.TRIANGLES, this.ibo.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }
}