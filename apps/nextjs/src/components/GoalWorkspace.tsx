// import React from "react";
// import { Label } from "@mui/icons-material";
// import {
//   Button,
//   Card,
//   FormControl,
//   FormHelperText,
//   FormLabel,
//   Textarea,
// } from "@mui/joy";

// export default function GoalInput() {
//   const fart = "hi";
//   return (
//     <Card color="neutral">
//       <form
//         onSubmit={(event) => {
//           event.preventDefault();
//         }}
//       >
//         <FormControl>
//           <FormLabel>Label</FormLabel>
//           <Textarea
//             placeholder="What's your goal?"
//             minRows={2}
//             size="lg"
//             required
//             variant="outlined"
//           />
//           {/* <FormHelperText>This is a helper text.</FormHelperText> */}
//         </FormControl>
//         <Button className="col-end" type="submit">
//           Submit
//         </Button>
//       </form>
//     </Card>
//   );
// }

import { api, type RouterOutputs } from "~/utils/api";

const GoalWorkspace: React.FC<{
  post: RouterOutputs["goal"]["all"][number];
  onPostDelete?: () => void;
}> = ({ post, onPostDelete }) => {
  return (
    <div className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]">
      <div className="flex-grow">
        <h2 className="text-2xl font-bold text-pink-400">{post.title}</h2>
        <p className="mt-2 text-sm">{post.content}</p>
      </div>
      <div>
        <span
          className="cursor-pointer text-sm font-bold uppercase text-pink-400"
          onClick={onPostDelete}
        >
          Delete
        </span>
      </div>
    </div>
  );
};

export default GoalWorkspace;
