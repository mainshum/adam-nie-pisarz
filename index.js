const fs = require('fs');
const pug = require('pug');
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const PORT = process.env.PORT || 3000;

const promisify = f => (...args) => new Promise((res, rej) => 
    f(...args, (err, files) => err ? rej(err) : res(files))
);

const Box = x => ({
    map: f => Box(f(x)),
    fold: f => f(x),
});

const tap = f => obj => {
    f(obj);
    return obj;
};

const confirmRunning = () => console.log('listening');

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const fileNameToPoemName = fileName => fileName
    .replace('.txt', '');

const mapPoemPromise = poemFile => 
    readFile(path.resolve(__dirname, 'poems', poemFile), 'utf-8')
        .then(contents => ({
            poemContents: contents,
            poemName: fileNameToPoemName(poemFile)
        }));

const readPoems = (poemsDir) => 
    readDir(poemsDir)
    .then(poemNames => 
        Promise.all(poemNames.map(mapPoemPromise))
    );

const registerPoem = (app, {poemContents, poemName}) => {
    app.get(`/${poemName}`, function(req, res) {
        res.render('poem_template', {title: poemName, poem: poemContents})
    });
}

readPoems(path.resolve(__dirname, 'poems'))
    .then(poems => 
        Box(express())
        .map(tap(a => a.set('view engine', 'pug')))
        .map(tap(a => a.use(morgan('tiny'))))
        .fold(tap(a => poems.map(p => registerPoem(a, p))))
    )
    .then(tap(a => console.log(a._router.stack)))
    .then(app => app.listen(PORT, confirmRunning))
    .catch(console.error);

