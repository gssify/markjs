# Markjs ![issues](https://img.shields.io/github/issues/gssify/markjs.svg) ![stars](https://img.shields.io/github/stars/gssify/markjs.svg) ![MIT](https://img.shields.io/badge/license-MIT-blue.svg)

基于[SVGJS](http://svgjs.com)的图像标注插件，支持不规则四边形标注，自定义字段标签.

# Demo

[https://gssify.github.io/markjs/](https://gssify.github.io/markjs/)

示例中添加标签信息按键：`CTRL` + `S`

删除已有标注：`双击标注`

## Installation
点击此处另外存: [Markjs](https://raw.githubusercontent.com/gssify/markjs/master/dist/mark.js)

## Basic Usage

```html
<div id="draw"></div>
<script src="lib/mark.js"></script>
```

```js
new Mark({
    // 标记容器
    id: 'draw',

    // 需要标记的图片地址
    url: './mark.jpg',

    // 在标注框删除前增加确认逻辑
    // callback为逻辑结束必须执行的函数
    // callback只有一个参数boolean值，表示是否删除
    beforeDelete: function (mark, callback) {
      callback(!!window.confirm('确定删除标记【' + mark.text + '】吗?'))
    },

    // 在标注框生成前增加确认逻辑，同时可以增加一下格外的业务数据
    // callback为逻辑结束必须执行的函数
    // callback第一个参数为boolean值，表示处理结果
    // callback第二个参数为额外的业务数据
    beforeAdd: function (mark, callback) {
      const result = window.prompt('可以打标记了')
      callback(!!result, {tag: result})
    },

    // 格式化tag数据，需要将业务字段转成 text
    dataFormat: function (mark) {
      if (!mark.data.tag) return
      return {
        text: mark.data.tag
      }
    },

    // 初始化的标记数据，格式必须严格遵守
    marks: [
      {
        points: [[192,106], [381,106],[381,238],[192,238]],
        data: {
          tag: '初始化标签'
        }
      }
    ]
  })
```

## Note
如果想在统一容器多次使用Markjs，需要先销毁实例，然后重新实例化

```js
var ins = new Mark({...})
ins.destroy()

// then
var ins2 = new Mark({...})
```
