import fs from "fs"

export const deleteFile = (name) => {
  fs.unlink(`./uploads/${name}`, (err) => {
    if (err) {
      console.error(err)
    }
  })
}


