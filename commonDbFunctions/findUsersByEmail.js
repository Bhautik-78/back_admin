import { Users } from "../api/users/users.model";

export const getMappedLoggedInUser = async email => {
  let returnObject
  try {
    returnObject = await Users.aggregate([
      {
        $match: {
          email: email.toLowerCase()
        }
      },
      {
        $project: {
          userId: "$_id",
          name: 1,
          email: 1,
          mobileNo: 1
        }
      }
    ]);
  } catch (err) {
    console.log("There is an error");
  }


  return returnObject[0];
};

export const getUserDetails = async email => {
  return await getMappedLoggedInUser(email);
};
