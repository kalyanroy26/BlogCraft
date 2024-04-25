import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const dataDirectory = path.join(__dirname, "data");
const filePath = path.join(dataDirectory, "blogData.json");

function saveDataToFile(data) {
    fs.writeFile(filePath, JSON.stringify(data), (err) => {
        if (err) {
            console.error("Error writing file:", err);
            return;
        }
        console.log("Data has been written to file successfully.");
    });
}

function fetchPostData(callback) {
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            callback(err, null);
            return;
        }
        callback(null, JSON.parse(data));
    });
}

function getAccessCodeForPost(id, callback) {
    fetchPostData((err, postData) => {
        if (err) {
            callback(err); // Propagate error to the calling function
            return;
        }
        const post = postData.find((post) => post.id === id);
        if (!post) {
            callback(new Error("Post not found")); // Propagate error to the calling function
            return;
        }
        // Pass the access code to the callback
        callback(null, post.code);
    });
}

function checkAccess(code, postId, callback) {
    getAccessCodeForPost(postId, (err, accessCode) => {
        if (err) {
            console.error(err);
            callback(err, false);
            return;
        }

        console.log("Existing access code:", accessCode);

        if (code === accessCode) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    });
}

// render all posts on home page
app.get("/", (req, res) => {
    fetchPostData((err, postData) => {
        if (err) {
            res.status(500).send("Error fetching post data");
            return;
        }
        res.render("home.ejs", { posts: postData });
    });
});

// render specific post
app.get("/posts/:id", (req, res) => {
    const postId = parseInt(req.params.id);
    fetchPostData((err, postData) => {
        if (err) {
            res.status(500).send("Error fetching post data");
            return;
        }
        const post = postData.find((post) => post.id === postId);
        if (!post) {
            res.status(404).send("Post not found");
            return;
        }
        res.render("post.ejs", { post });
    });
});

//route to new blog post form
app.get("/write", (req, res) => {
    res.render("write.ejs");
});

// collecting form data
app.post("/post", (req, res) => {
    const currentDate = new Date();
    const options = { day: "numeric", month: "long", year: "numeric" };
    const formattedDate = currentDate.toLocaleDateString("en-US", options);

    fetchPostData((err, postData) => {
        if (err) {
            res.status(500).send("Error fetching post data");
            return;
        }

        const post = {
            id: postData.length + 1,
            title: req.body.title,
            content: req.body.content,
            imageUrl: req.body.imageUrl,
            code: req.body.code,
            author: req.body.author,
            date: formattedDate,
        };

        postData.push(post);
        saveDataToFile(postData);
        console.log("Post created:", post);
        res.redirect("/");
    });
});

// collecting edited form data
app.post("/edited/:id", (req, res) => {
    const postId = parseInt(req.params.id);

    fetchPostData((err, postData) => {
        if (err) {
            res.status(500).send("Error fetching post data");
            return;
        }

        const postIndex = postData.findIndex((post) => post.id === postId);
        if (postIndex === -1) {
            res.status(404).send("Post not found");
            return;
        }

        postData[postIndex].title = req.body.title;
        postData[postIndex].content = req.body.content;
        postData[postIndex].imageUrl = req.body.imageUrl;
        postData[postIndex].code = req.body.code;
        postData[postIndex].author = req.body.author;

        saveDataToFile(postData);
        console.log("Post updated:", postData[postIndex]);
        res.redirect("/");
    });
});

// render form with existing data for editing
app.post("/edit/:id", (req, res) => {
    const postId = parseInt(req.params.id);
    const code = req.body.code;

    checkAccess(code, postId, (err, accessAllowed) => {
        if (err) {
            // Handle error
            console.error(err);
            res.status(500).send("Error checking access");
            return;
        }

        if (!accessAllowed) {
            // Access denied
            res.send("Incorrect access code");
            return;
        }

        fetchPostData((err, postData) => {
            if (err) {
                res.status(500).send("Error fetching post data");
                return;
            }
            const postToEdit = postData.find((post) => post.id === postId);
            if (!postToEdit) {
                res.status(404).send("Post not found");
                return;
            }
            res.render("edit.ejs", { post: postToEdit });
        });
    });
});

app.get("/edit/:id", (req, res) => {
    const postId = parseInt(req.params.id);
    res.render("edit-code.ejs", { id: postId });
});

app.get("/delete/:id", (req, res) => {
    const postId = parseInt(req.params.id);
    res.render("delete-code.ejs", { id: postId });
});


// route to delete post from web page
app.post('/delete/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const code = req.body.code;

    checkAccess(code, postId, (err, accessAllowed) => {
        if (err) {
            // Handle error
            console.error(err);
            res.status(500).send("Error checking access");
            return;
        }

        if (!accessAllowed) {
            // Access denied
            res.send("Incorrect access code");
            return;
        }

        fetchPostData((err, postData) => {
            if (err) {
                res.status(500).send("Error fetching post data");
                return;
            } else {
                const updatedPosts = postData.filter(post => post.id !== postId);
                saveDataToFile(updatedPosts);
                console.log("Post deleted:", postId);
                res.redirect('/');
            }
        });
    });
    
});

// render about page
app.get("/about", (req, res) => {
    res.render("about.ejs");
});

// render contact page
app.get("/contact", (req, res) => {
    res.render("contact.ejs");
});

app.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
});
