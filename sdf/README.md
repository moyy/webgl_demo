# 2D SDF 实验

## glyphy

对 C++ 项目 [glyphy](https://github.com/moyy/glyphy) 的 Shader进行 JS-验证；

目前文字：微软雅黑-魔，要替换文字：

+ 用 VS2019 编译 Debug 版本 的 [glyphy](https://github.com/moyy/glyphy)
+ 运行 Demo
+ 将里面的纹理数据：一大串 以空格 分割的 数字拷贝到 shape/glyphy.js 中对应的地方；
+ u_atlas_tex 的 宽，默认为 64
+ 纹理宽高，够用就行；
+ 将控制台 a_glyph_vertex 的打印 拷贝到 shape/glyphy.js 对应的变量 即可；
