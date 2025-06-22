import { ObjectId } from "mongodb";
import { NodeType } from "../enums/projects.enum";
export const  transformObjectId = ({ value }: { value: any }) => {
  return value instanceof ObjectId ? value.toHexString() : value;
}

export const exposeBasedOnNodeType = (
  requiredType: NodeType,
  { obj }: { obj: any },
) => {

  if (obj.type === requiredType) {
    return obj.content; 
  }
  return undefined;
};