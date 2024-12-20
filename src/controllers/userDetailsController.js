"use strict";

const User = require("../models/userModel");
const UserDetails = require("../models/userDetailsModel");
const Address = require("../models/addressModel");
const { CustomError } = require("../errors/customError");
const {
  validateUserDetailsUpdatePayload,
} = require("../validators/userValidator");
const translations = require("../../locales/translations");

module.exports = {
  // GET
  list: async (req, res) => {
    /*
        #swagger.tags = ["Details"]
        #swagger.summary = "List Users' Details"
        #swagger.description = `
          You can send query with endpoint for search[], sort[], page and limit.
          <ul> Examples:
              <li>URL/?<b>search[field1]=value1&search[field2]=value2</b></li>
              <li>URL/?<b>sort[field1]=1&sort[field2]=-1</b></li>
              <li>URL/?<b>page=2&limit=1</b></li>
          </ul>
        `
      */

    let listFilter = {};

    // if (!req.user?.userType.toLowerCase() !== "admin") {
    //   listFilter._id = req.user._id;
    // }

    const data = await res.getModelList(UserDetails, listFilter, [
      {
        path: "interestIds",
        select: "name _id",
      },
      {
        path: "addressId",
        select: "-createdAt -updatedAt -__v",
      },
    ]);

    res.status(200).send({
      error: false,
      details: await res.getModelListDetails(UserDetails),
      data,
    });
  },
  // /:id => GET
  read: async (req, res) => {
    /*
        #swagger.tags = ["Details"]
        #swagger.summary = "Get Single User's Details"
        #swagger.parameters['id'] = {
          in: 'path',
          description: 'User ID',
          required: true,
          type: 'string'
        }
      */

    const data = await UserDetails.findOne({ _id: req.params.id }).populate([
      {
        path: "interestIds",
        select: "name _id",
      },
      {
        path: "addressId",
        select: "-createdAt -updatedAt -__v",
      },
    ]);

    res.status(200).send({
      error: false,
      data,
    });
  },
  // /:id => PUT / PATCH
  update: async (req, res) => {
    /*
      #swagger.tags = ["Details"]
      #swagger.summary = "Update Single User's Details"
      #swagger.parameters['id'] = {
        in: 'path',
        description: 'User ID',
        required: true,
        type: 'string'
      }      
      #swagger.parameters['body'] = {
          in: 'body',
          required: true,
          schema: {
              $ref: "#/definitions/UserDetails'
          }
      }
    */

    const validationError = await validateUserDetailsUpdatePayload(
      req.t,
      req.body
    );

    if (validationError) {
      throw new CustomError(validationError, 400);
    }

    const userDetails = await UserDetails.findOne({ _id: req.params.id });

    if (!userDetails) {
      throw new CustomError(req.t(translations.userDetails.notFound), 404);
    }

    // console.log("req.user._id", req.user._id);

    const userId =
      req.user?.userType === "admin" ? req.body.userId : req.user._id;

    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new CustomError(req.t(translations.user.notFound), 404);
    }

    if (req.body.city || req.body.country) {
      if (user.userType === "individual") {
        const updateData = {
          city: req.body.city,
          country: req.body.country,
        };
        if (Object.keys(updateData).length > 0) {
          if (userDetails.addressId) {
            await Address.findOneAndUpdate(
              { _id: userDetails.addressId },
              updateData
            );
          } else {
            const address = new Address(updateData);
            const savedAddress = await address.save();
            userDetails.addressId = savedAddress._id;
            await userDetails.save();
          }
        }
      }

      if (user.userType === "organization") {
        const requiredFields = [
          "city",
          "country",
          "zipCode",
          "streetName",
          "streetNumber",
        ];
        const updateData = {};

        for (const field of requiredFields) {
          if (!req.body[field] || req.body[field].trim() === "") {
            throw new CustomError(`${field} is required for an organization.`);
          }
          updateData[field] = req.body[field];
        }

        // Include optional 'state' field if provided
        if (req.body.state && req.body.state.trim() !== "") {
          updateData.state = req.body.state;
        }

        if (userDetails.addressId) {
          await Address.findOneAndUpdate(
            { _id: userDetails.addressId },
            updateData
          );
        } else {
          const address = new Address(updateData);
          const savedAddress = await address.save();
          userDetails.addressId = savedAddress._id;
          await userDetails.save();
        }
      }
    }

    req.body.userId = userId;
    // console.log("userId", req.body.userId);

    const data = await UserDetails.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      {
        runValidators: true,
        new: true,
      }
    ).populate([
      {
        path: "interestIds",
        select: "name _id",
      },
      {
        path: "addressId",
        select: "-createdAt -updatedAt -__v",
      },
    ]); // returns data (user's details)

    res.status(202).send({
      error: false,
      message: req.t(translations.userDetails.update),
      new: await User.findOne({ _id: user._id }).populate([
        {
          path: "userDetailsId",
          populate: [
            {
              path: "interestIds",
              select: "name _id",
            },
            {
              path: "addressId",
              select: "-createdAt -updatedAt -__v",
            },
          ],
        },
        { path: "documentIds", select: "-__v" },
      ]),
      data,
    });
  },
};
