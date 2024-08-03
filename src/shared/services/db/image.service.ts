import { IFileImageDocument } from '../../../features/images/interfaces/image.interface';
import { ImageModel } from '../../../features/images/models/image.schema';
import { UserModel } from '../../../features/user/models/user.schema';
import mongoose from 'mongoose';

class ImageService {



  // Add user profile image URL to DB
  public async addUserProfileImageToDB(userId: string, url: string, imgId: string, imgVersion: string): Promise<void> {

    // Find the user prifile by userId and update profilePicture URL stored in cloudinary
    await UserModel.updateOne({ _id: userId }, { $set: { profilePicture: url } }).exec();

    // Updating image model
    await this.addImage(userId, imgId, imgVersion, 'profile');
  }




  public async addBackgroundImageToDB(userId: string, imgId: string, imgVersion: string): Promise<void> {

    // Find the user prifile by userId and update bgImageId and bgImageVersion stored in cloudinary
    await UserModel.updateOne({ _id: userId }, { $set: { bgImageId: imgId, bgImageVersion: imgVersion } }).exec();

    // Updating image model
    await this.addImage(userId, imgId, imgVersion, 'background');
  }




  public async addImage(userId: string, imgId: string, imgVersion: string, type: string): Promise<void> {

    // Updating image model
    await ImageModel.create({
      userId,
      bgImageVersion: type === 'background' ? imgVersion : '',
      bgImageId: type === 'background' ? imgId : '',
      imgVersion,
      imgId
    });
  }




  public async removeImageFromDB(imageId: string): Promise<void> {

    // Deleting image info from imageModel
    await ImageModel.deleteOne({ _id: imageId }).exec();
  }




  public async getImageByBackgroundId(bgImageId: string): Promise<IFileImageDocument> {

    // get background image info from image model using bgImageId
    const image: IFileImageDocument = (await ImageModel.findOne({ bgImageId }).exec()) as IFileImageDocument;

    // return image info
    return image;
  }




  public async getImages(userId: string): Promise<IFileImageDocument[]> {

    // get user image info from image model using userId
    const images: IFileImageDocument[] = await ImageModel.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId) } }]);

    // return image info
    return images;
  }
}

export const imageService: ImageService = new ImageService();
