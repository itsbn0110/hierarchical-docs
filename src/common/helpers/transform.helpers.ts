import { ObjectId } from "mongodb";
import { NodeType } from "../enums/projects.enum";

interface NodeObject {
  type: NodeType;
  content: unknown;
}

export const transformObjectId = ({ value }: { value: unknown }) => {
  return value instanceof ObjectId ? value.toHexString() : value;
};


export const exposeBasedOnNodeType = (requiredType: NodeType, { obj }: { obj: NodeObject }) => {
  if (obj.type === requiredType) {
    return obj.content;
  }
  return undefined;
};
