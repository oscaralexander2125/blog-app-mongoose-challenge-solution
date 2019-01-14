'use strict';

const chai=  require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
  console.info('Seeding blog data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generatePostData())
  }
  return BlogPost.insertMany(seedData);
}

function generatePostData() {
  return {
    author:{
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.company.catchPhrase(),
    content: faker.lorem.sentence(),
    created: faker.date.recent()
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('blogs api resource', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {

    it('should return all blogposts', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body).to.have.lengthOf.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        })
    })

    it ('should return blogs with certain fields included', function() {
      let resBlog;
      return chai.request(app)
      .get('/posts')
      .then(function(res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.lengthOf.at.least(1);

        res.body.forEach(blog => {
          expect(blog).to.be.a('object');
          expect(blog).to.include.keys(
            'id', 'author', 'title', 'content', 'created'
          );
        });
        resBlog = res.body[0];
        return BlogPost.findById(resBlog.id);
      })
      .then(function(post) {
        expect(resBlog.id).to.equal(post.id);
        expect(resBlog.name).to.equal(post.name);
        expect(resBlog.title).to.equal(post.title);
      });
    })
  });

  describe('POST endpoint', function() {

    it('should add a new post', function() {
      const newPost = generatePostData();
      
      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'author', 'content', 'title'
          );
          expect(res.body.title).to.equal(newPost.title);
          expect(res.body.content).to.equal(newPost.content);
          expect(res.body.id).to.not.be.null;

          return BlogPost.findById(res.body.id)
        })
        .then(function(post) {
          expect(post.title).to.equal(newPost.title);
          expect(post.content).to.equal(newPost.content);
          expect(post.author.firstName).to.equal(newPost.author.firstName);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update posts', function() {
      const updateData = {
        title: 'new title',
        content: 'hello yall'
      };

      return BlogPost.findOne()
        .then(function(post) {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(updateData.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(updateData.title);
          expect(post.content).to.equal(updateData.content);
        });
    })
  })

  describe('DELETE endpoint', function() {

    it('should delete a post', function() {
      let post;

      return BlogPost.findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app)
            .delete(`/posts/${post.id}`)
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(post.id)
        })
        .then(function(_post) {
          expect(_post).to.be.null;
        });
    });
  });
});

