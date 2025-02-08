import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";

interface PaintCanvasProps {
  selectedTool: string;
  selectedPattern: string;
  strokeWidth: number;
  onCanUndoChange: (canUndo: boolean) => void;
  onCanRedoChange: (canRedo: boolean) => void;
  onContentChange?: () => void;
}

interface PaintCanvasRef {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportCanvas: () => string;
  importImage: (dataUrl: string) => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Selection {
  startX: number;
  startY: number;
  width: number;
  height: number;
  imageData?: ImageData;
}

export const PaintCanvas = forwardRef<PaintCanvasRef, PaintCanvasProps>(
  (
    {
      selectedTool,
      selectedPattern,
      strokeWidth,
      onCanUndoChange,
      onCanRedoChange,
      onContentChange,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawing = useRef(false);
    const historyRef = useRef<ImageData[]>([]);
    const historyIndexRef = useRef(-1);
    const patternRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(
      null
    );
    const startPointRef = useRef<Point | null>(null);
    const lastImageRef = useRef<ImageData | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [textPosition, setTextPosition] = useState<Point | null>(null);
    const textInputRef = useRef<HTMLInputElement | null>(null);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const dragStartRef = useRef<Point | null>(null);
    const dashOffsetRef = useRef(0);
    const animationFrameRef = useRef<number>();
    const touchStartRef = useRef<Point | null>(null);
    const [isLoadingFile] = useState(false);

    // Handle canvas resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;

          // Store current canvas content
          const tempCanvas = document.createElement("canvas");
          const tempContext = tempCanvas.getContext("2d", {
            willReadFrequently: true,
          });
          if (tempContext && contextRef.current) {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempContext.drawImage(canvas, 0, 0);
          }

          // Update canvas size
          canvas.width = width;
          canvas.height = height;

          // Restore context properties
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.lineCap = "round";
            context.lineJoin = "round";
            context.lineWidth = strokeWidth;
            contextRef.current = context;

            // Restore pattern if exists
            if (patternRef.current) {
              const pattern = context.createPattern(
                patternRef.current,
                "repeat"
              );
              if (pattern) {
                context.strokeStyle = pattern;
                context.fillStyle = pattern;
              }
            }

            // Restore canvas content
            if (tempContext) {
              context.drawImage(
                tempCanvas,
                0,
                0,
                tempCanvas.width,
                tempCanvas.height,
                0,
                0,
                width,
                height
              );
            }
          }
        }
      });

      resizeObserver.observe(canvas);
      return () => resizeObserver.disconnect();
    }, [strokeWidth]);

    // Handle ESC key and shortcuts
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        // Handle selection escape
        if (event.key === "Escape" && selection) {
          // Restore canvas to state before selection
          if (lastImageRef.current && contextRef.current) {
            contextRef.current.putImageData(lastImageRef.current, 0, 0);
          }
          setSelection(null);
          return;
        }

        // Handle undo/redo shortcuts
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const cmdKey = isMac ? event.metaKey : event.ctrlKey;

        if (cmdKey && !event.altKey) {
          if (event.shiftKey && event.key.toLowerCase() === "z") {
            // Cmd/Ctrl+Shift+Z - Redo
            event.preventDefault();
            if (historyIndexRef.current < historyRef.current.length - 1) {
              historyIndexRef.current++;
              const imageData = historyRef.current[historyIndexRef.current];
              if (contextRef.current && imageData) {
                contextRef.current.putImageData(imageData, 0, 0);
              }
              onCanUndoChange(true);
              onCanRedoChange(
                historyIndexRef.current < historyRef.current.length - 1
              );
            }
          } else if (!event.shiftKey && event.key.toLowerCase() === "z") {
            // Cmd/Ctrl+Z - Undo
            event.preventDefault();
            if (historyIndexRef.current > 0) {
              historyIndexRef.current--;
              const imageData = historyRef.current[historyIndexRef.current];
              if (contextRef.current && imageData) {
                contextRef.current.putImageData(imageData, 0, 0);
              }
              onCanUndoChange(historyIndexRef.current > 0);
              onCanRedoChange(true);
            }
          } else if (!event.shiftKey && event.key.toLowerCase() === "y") {
            // Cmd/Ctrl+Y - Alternative Redo
            event.preventDefault();
            if (historyIndexRef.current < historyRef.current.length - 1) {
              historyIndexRef.current++;
              const imageData = historyRef.current[historyIndexRef.current];
              if (contextRef.current && imageData) {
                contextRef.current.putImageData(imageData, 0, 0);
              }
              onCanUndoChange(true);
              onCanRedoChange(
                historyIndexRef.current < historyRef.current.length - 1
              );
            }
          }
        }
      },
      [selection, onCanUndoChange, onCanRedoChange]
    );

    useEffect(() => {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Animate selection dashes
    useEffect(() => {
      if (!selection) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        // Restore canvas to state before selection was made
        if (lastImageRef.current && contextRef.current) {
          contextRef.current.putImageData(lastImageRef.current, 0, 0);
        }
        return;
      }

      const animate = () => {
        if (
          !contextRef.current ||
          !canvasRef.current ||
          !selection ||
          !lastImageRef.current
        )
          return;

        // Always restore the original canvas state before drawing selection
        contextRef.current.putImageData(lastImageRef.current, 0, 0);

        // Draw animated selection rectangle
        contextRef.current.save();
        contextRef.current.strokeStyle = "#000";
        contextRef.current.lineWidth = 1;
        contextRef.current.setLineDash([5, 5]);
        contextRef.current.lineDashOffset = dashOffsetRef.current;
        contextRef.current.strokeRect(
          selection.startX,
          selection.startY,
          selection.width,
          selection.height
        );
        contextRef.current.restore();

        // Update dash offset
        dashOffsetRef.current = (dashOffsetRef.current + 1) % 10;
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [selection]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Only set up the canvas dimensions and context once
      if (!contextRef.current) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = strokeWidth;
        contextRef.current = context;

        // Save initial canvas state
        saveToHistory();
      }

      // Load and update the pattern
      const patternNum = selectedPattern.split("-")[1];
      const img = new Image();
      img.crossOrigin = "anonymous"; // Add cross-origin attribute before setting src

      img.onload = () => {
        // Create a temporary canvas to draw the pattern
        const patternCanvas = document.createElement("canvas");
        const patternContext = patternCanvas.getContext("2d");
        if (!patternContext || !contextRef.current) return;

        // Set pattern canvas size to match the pattern size
        patternCanvas.width = img.width;
        patternCanvas.height = img.height;

        // Draw the pattern onto the temporary canvas
        patternContext.drawImage(img, 0, 0);

        // Store the pattern canvas instead of the image
        patternRef.current = patternCanvas;

        // Create pattern from the temporary canvas
        const pattern = contextRef.current.createPattern(
          patternCanvas,
          "repeat"
        );
        if (pattern) {
          contextRef.current.strokeStyle = pattern;
          contextRef.current.fillStyle = pattern;
        }
      };

      img.onerror = (e) => {
        console.error("Error loading pattern:", e);
      };

      img.src = `/patterns/Property 1=${patternNum}.svg`;
    }, [selectedPattern]);

    useEffect(() => {
      if (contextRef.current) {
        contextRef.current.lineWidth = strokeWidth;
      }
    }, [strokeWidth]);

    // Helper to check if two ImageData objects are different
    const hasCanvasChanged = (
      prevImageData: ImageData,
      newImageData: ImageData
    ) => {
      if (
        prevImageData.width !== newImageData.width ||
        prevImageData.height !== newImageData.height
      ) {
        return true;
      }

      // Compare pixel data
      const prevData = prevImageData.data;
      const newData = newImageData.data;
      const length = prevData.length;

      // Only check every 4th pixel (RGBA) for performance
      for (let i = 0; i < length; i += 16) {
        if (prevData[i] !== newData[i]) {
          return true;
        }
      }
      return false;
    };

    const saveToHistory = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const newImageData = contextRef.current.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Check if there are any states in history
      if (historyIndexRef.current >= 0) {
        const prevImageData = historyRef.current[historyIndexRef.current];

        // Only save if the canvas has actually changed
        if (!hasCanvasChanged(prevImageData, newImageData)) {
          return;
        }
      }

      // Remove any redo states
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );

      // Limit history size to prevent memory issues (keep last 50 states)
      if (historyRef.current.length >= 50) {
        historyRef.current = historyRef.current.slice(-49);
        historyIndexRef.current = Math.min(historyIndexRef.current, 48);
      }

      // Add current state to history
      historyRef.current.push(newImageData);
      historyIndexRef.current++;

      // Update undo/redo availability
      onCanUndoChange(historyIndexRef.current > 0);
      onCanRedoChange(historyIndexRef.current < historyRef.current.length - 1);

      // Notify content change
      if (!isLoadingFile) {
        onContentChange?.();
      }
    }, [
      onCanUndoChange,
      onCanRedoChange,
      onContentChange,
      hasCanvasChanged,
      isLoadingFile,
    ]);

    // Clipboard methods
    const copySelectionToClipboard = useCallback(() => {
      if (!contextRef.current || !canvasRef.current) return;

      let imageData: ImageData;
      if (selection && selection.imageData) {
        // If there's a selection, copy just that
        imageData = selection.imageData;
      } else {
        // If no selection, copy entire canvas
        imageData = contextRef.current.getImageData(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }

      // Create a temporary canvas to convert the image data to a data URL
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCtx.putImageData(imageData, 0, 0);
      tempCanvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).catch(console.error);
        }
      });
    }, [selection]);

    const handlePaste = useCallback(async () => {
      if (!contextRef.current || !canvasRef.current) return;

      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            if (type.startsWith("image/")) {
              const blob = await clipboardItem.getType(type);
              const img = new Image();
              img.src = URL.createObjectURL(blob);
              await new Promise((resolve) => {
                img.onload = () => {
                  if (!contextRef.current || !canvasRef.current) return;

                  // If there's a selection, paste into the selection area
                  if (selection) {
                    contextRef.current.drawImage(
                      img,
                      selection.startX,
                      selection.startY,
                      selection.width,
                      selection.height
                    );
                  } else {
                    // If no selection, paste at center
                    const x = (canvasRef.current.width - img.width) / 2;
                    const y = (canvasRef.current.height - img.height) / 2;
                    contextRef.current.drawImage(img, x, y);
                  }
                  saveToHistory();
                  if (onContentChange) onContentChange();
                  resolve(null);
                };
              });
              URL.revokeObjectURL(img.src);
              break;
            }
          }
        }
      } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
      }
    }, [selection, saveToHistory, onContentChange]);

    const clearSelection = useCallback(() => {
      if (!contextRef.current || !selection) return;

      // Fill selection area with white
      contextRef.current.save();
      contextRef.current.fillStyle = "#FFFFFF";
      contextRef.current.fillRect(
        selection.startX,
        selection.startY,
        selection.width,
        selection.height
      );
      contextRef.current.restore();

      saveToHistory();
      if (onContentChange) onContentChange();
    }, [selection, saveToHistory, onContentChange]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        undo: () => {
          if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
            const imageData = historyRef.current[historyIndexRef.current];
            if (contextRef.current && imageData) {
              contextRef.current.putImageData(imageData, 0, 0);
            }
            onCanUndoChange(historyIndexRef.current > 0);
            onCanRedoChange(true);
          }
        },
        redo: () => {
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            const imageData = historyRef.current[historyIndexRef.current];
            if (contextRef.current && imageData) {
              contextRef.current.putImageData(imageData, 0, 0);
            }
            onCanUndoChange(true);
            onCanRedoChange(
              historyIndexRef.current < historyRef.current.length - 1
            );
          }
        },
        clear: () => {
          if (!contextRef.current || !canvasRef.current) return;
          contextRef.current.fillStyle = "#FFFFFF";
          contextRef.current.fillRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          saveToHistory();
        },
        exportCanvas: () => canvasRef.current?.toDataURL() || "",
        importImage: (dataUrl: string) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            if (!contextRef.current || !canvasRef.current) return;

            // Calculate dimensions to maintain aspect ratio
            const canvas = canvasRef.current;
            const ctx = contextRef.current;

            // Clear the canvas first
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate dimensions maintaining aspect ratio
            const canvasRatio = canvas.width / canvas.height;
            const imageRatio = img.width / img.height;

            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let x = 0;
            let y = 0;

            if (canvasRatio > imageRatio) {
              // Canvas is wider than image ratio
              drawWidth = canvas.height * imageRatio;
              x = (canvas.width - drawWidth) / 2;
            } else {
              // Canvas is taller than image ratio
              drawHeight = canvas.width / imageRatio;
              y = (canvas.height - drawHeight) / 2;
            }

            // Draw the image centered and scaled
            contextRef.current.drawImage(img, x, y, drawWidth, drawHeight);
            saveToHistory();
          };
        },
        cut: () => {
          copySelectionToClipboard();
          clearSelection();
        },
        copy: copySelectionToClipboard,
        paste: handlePaste,
      }),
      [copySelectionToClipboard, clearSelection, handlePaste, saveToHistory]
    );

    // Add keyboard shortcuts for clipboard operations
    useEffect(() => {
      const handleClipboardShortcuts = (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const cmdKey = isMac ? e.metaKey : e.ctrlKey;

        if (cmdKey && !e.shiftKey && !e.altKey) {
          if (e.key.toLowerCase() === "x") {
            e.preventDefault();
            copySelectionToClipboard();
            clearSelection();
          } else if (e.key.toLowerCase() === "c") {
            e.preventDefault();
            copySelectionToClipboard();
          } else if (e.key.toLowerCase() === "v") {
            e.preventDefault();
            handlePaste();
          }
        }
      };

      window.addEventListener("keydown", handleClipboardShortcuts);
      return () =>
        window.removeEventListener("keydown", handleClipboardShortcuts);
    }, [copySelectionToClipboard, clearSelection, handlePaste]);

    const getCanvasPoint = (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();

      // Handle both mouse and touch events
      let clientX: number;
      let clientY: number;

      if ("touches" in event) {
        // For touchend/touchcancel, touches list will be empty, so use changedTouches
        if (event.touches.length === 0 && event.changedTouches?.length > 0) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
        } else if (event.touches.length > 0) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        } else {
          // If no touch data available, return the last known point or a default
          return startPointRef.current || { x: 0, y: 0 };
        }
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const isPointInSelection = (point: Point, sel: Selection): boolean => {
      return (
        point.x >= sel.startX &&
        point.x <= sel.startX + sel.width &&
        point.y >= sel.startY &&
        point.y <= sel.startY + sel.height
      );
    };

    const floodFill = (startX: number, startY: number) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context || !patternRef.current) return;

      // Get the image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Get the color at target pixel
      const startPos = (startY * canvas.width + startX) * 4;
      const startR = pixels[startPos];
      const startG = pixels[startPos + 1];
      const startB = pixels[startPos + 2];
      const startA = pixels[startPos + 3];

      // Create a temporary canvas to draw the pattern
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempContext = tempCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!tempContext) return;

      // Fill the temporary canvas with the pattern
      const pattern = tempContext.createPattern(patternRef.current, "repeat");
      if (!pattern) return;
      tempContext.fillStyle = pattern;
      tempContext.fillRect(0, 0, canvas.width, canvas.height);
      const patternData = tempContext.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Performance optimization: Check if we're trying to fill with the same color
      const targetPos = (startY * canvas.width + startX) * 4;
      if (
        pixels[targetPos] === patternData.data[targetPos] &&
        pixels[targetPos + 1] === patternData.data[targetPos + 1] &&
        pixels[targetPos + 2] === patternData.data[targetPos + 2] &&
        pixels[targetPos + 3] === patternData.data[targetPos + 3]
      ) {
        return; // No need to fill if the colors are the same
      }

      // Performance optimization: Limit the maximum area to fill (e.g., 80% of canvas)
      const maxPixels = Math.floor(canvas.width * canvas.height * 0.8);
      let filledPixels = 0;

      // Helper to check if a pixel matches the start color
      const matchesStart = (pos: number) => {
        return (
          pixels[pos] === startR &&
          pixels[pos + 1] === startG &&
          pixels[pos + 2] === startB &&
          pixels[pos + 3] === startA
        );
      };

      // Helper to set a pixel to the pattern color
      const setPixel = (pos: number) => {
        pixels[pos] = patternData.data[pos];
        pixels[pos + 1] = patternData.data[pos + 1];
        pixels[pos + 2] = patternData.data[pos + 2];
        pixels[pos + 3] = patternData.data[pos + 3];
        filledPixels++;
      };

      // Scanline stack for flood fill (more efficient than pixel stack)
      interface ScanLine {
        y: number;
        leftX: number;
        rightX: number;
        direction: number; // 1 for up, -1 for down
      }
      const scanlines: ScanLine[] = [];

      // Add initial scanline
      scanlines.push({
        y: startY,
        leftX: startX,
        rightX: startX,
        direction: 1,
      });
      scanlines.push({
        y: startY,
        leftX: startX,
        rightX: startX,
        direction: -1,
      });

      while (scanlines.length > 0 && filledPixels < maxPixels) {
        const { y, leftX, rightX, direction } = scanlines.pop()!;
        const newY = y + direction;

        // Skip if we're out of bounds
        if (newY < 0 || newY >= canvas.height) continue;

        // Find the extents of the current scanline
        let x1 = leftX;
        let x2 = rightX;

        // Extend left
        while (x1 > 0 && matchesStart((y * canvas.width + (x1 - 1)) * 4)) {
          x1--;
        }

        // Extend right
        while (
          x2 < canvas.width - 1 &&
          matchesStart((y * canvas.width + (x2 + 1)) * 4)
        ) {
          x2++;
        }

        // Fill the current scanline
        for (let x = x1; x <= x2; x++) {
          setPixel((y * canvas.width + x) * 4);
        }

        // Look for new scanlines above/below
        let inRange = false;
        for (let x = x1; x <= x2; x++) {
          const newPos = (newY * canvas.width + x) * 4;
          const matchesNow = matchesStart(newPos);

          if (!inRange && matchesNow) {
            scanlines.push({
              y: newY,
              leftX: x,
              rightX: x,
              direction: direction,
            });
            inRange = true;
          } else if (inRange && !matchesNow) {
            scanlines[scanlines.length - 1].rightX = x - 1;
            inRange = false;
          }
        }
        if (inRange) {
          scanlines[scanlines.length - 1].rightX = x2;
        }
      }

      // Put the modified image data back
      context.putImageData(imageData, 0, 0);
      saveToHistory();
    };

    const renderText = (text: string) => {
      if (!contextRef.current || !patternRef.current || !textPosition) return;

      const context = contextRef.current;
      context.save();

      // Set up text rendering
      context.font = `16px Geneva-12`;
      context.textBaseline = "top";

      // Create pattern from the pattern canvas
      const pattern = context.createPattern(patternRef.current, "repeat");
      if (pattern) {
        context.fillStyle = pattern;
        context.fillText(text, textPosition.x, textPosition.y);
      }

      context.restore();
      saveToHistory();
    };

    const handleTextInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        const text = event.currentTarget.value;
        if (!text) {
          setIsTyping(false);
          return;
        }

        renderText(text);
        event.currentTarget.value = "";
        setIsTyping(false);
      }
    };

    const handleTextBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const text = event.currentTarget.value;
      if (text) {
        renderText(text);
      }
      setIsTyping(false);
    };

    const startDrawing = useCallback(
      (
        event:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>
      ) => {
        const canvas = canvasRef.current;
        if (!canvas || !contextRef.current) return;

        const point = getCanvasPoint(event);

        // Store touch start position for tap detection
        if ("touches" in event) {
          touchStartRef.current = point;
          // Execute bucket fill immediately on touch for better responsiveness
          if (selectedTool === "bucket") {
            floodFill(Math.floor(point.x), Math.floor(point.y));
            return;
          }
        }

        // Handle selection tool click
        if (selectedTool === "rect-select") {
          // If clicking outside selection, clear it
          if (selection && !isPointInSelection(point, selection)) {
            // Restore canvas to state before selection
            if (lastImageRef.current) {
              contextRef.current.putImageData(lastImageRef.current, 0, 0);
            }
            setSelection(null);
          }

          // If clicking inside existing selection, prepare for drag
          if (selection && isPointInSelection(point, selection)) {
            setIsDraggingSelection(true);
            dragStartRef.current = point;
            return;
          }

          // Start new selection
          startPointRef.current = point;
          // Store the current canvas state before starting new selection
          lastImageRef.current = contextRef.current.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          return;
        }

        // Clear any existing selection when starting to draw with other tools
        if (selection) {
          // Restore canvas to state before selection
          if (lastImageRef.current) {
            contextRef.current.putImageData(lastImageRef.current, 0, 0);
          }
          setSelection(null);
        }

        if (selectedTool === "text") {
          if (!isTyping) {
            // Only set new position when starting new text input
            setTextPosition(point);
          }
          setIsTyping(true);
          // Focus the input after a short delay to ensure it's mounted
          setTimeout(() => {
            if (textInputRef.current) {
              textInputRef.current.focus();
            }
          }, 0);
          return;
        }

        // Handle bucket fill for mouse click
        if (selectedTool === "bucket" && !("touches" in event)) {
          floodFill(Math.floor(point.x), Math.floor(point.y));
          return;
        }

        if (["line", "rectangle", "oval"].includes(selectedTool)) {
          // Store the current canvas state for shape preview
          lastImageRef.current = contextRef.current.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          startPointRef.current = point;
        } else {
          // Set up context based on tool
          if (selectedTool === "eraser") {
            contextRef.current.globalCompositeOperation = "destination-out";
            contextRef.current.strokeStyle = "#FFFFFF"; // Use white color for eraser
          } else {
            contextRef.current.globalCompositeOperation = "source-over";
            // Restore pattern for drawing tools
            if (patternRef.current) {
              const pattern = contextRef.current.createPattern(
                patternRef.current,
                "repeat"
              );
              if (pattern) {
                contextRef.current.strokeStyle = pattern;
              }
            }
          }

          contextRef.current.beginPath();
          contextRef.current.moveTo(point.x, point.y);
        }

        isDrawing.current = true;
      },
      [
        selectedTool,
        selection,
        isTyping,
        floodFill,
        isPointInSelection,
        setSelection,
        setTextPosition,
        setIsTyping,
      ]
    );

    const draw = useCallback(
      (
        event:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>
      ) => {
        if (!contextRef.current || !canvasRef.current) return;

        const point = getCanvasPoint(event);

        // Handle selection dragging
        if (isDraggingSelection && selection && dragStartRef.current) {
          const dx = point.x - dragStartRef.current.x;
          const dy = point.y - dragStartRef.current.y;

          setSelection((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              startX: prev.startX + dx,
              startY: prev.startY + dy,
            };
          });

          dragStartRef.current = point;
          return;
        }

        // Handle selection drawing
        if (
          selectedTool === "rect-select" &&
          startPointRef.current &&
          lastImageRef.current
        ) {
          contextRef.current.putImageData(lastImageRef.current, 0, 0);

          const width = point.x - startPointRef.current.x;
          const height = point.y - startPointRef.current.y;

          // Draw selection rectangle
          contextRef.current.save();
          contextRef.current.strokeStyle = "#000";
          contextRef.current.lineWidth = 1; // Force 1px width for selection
          contextRef.current.setLineDash([5, 5]);
          contextRef.current.strokeRect(
            startPointRef.current.x,
            startPointRef.current.y,
            width,
            height
          );
          contextRef.current.restore();
          return;
        }

        if (!isDrawing.current) return;

        if (
          ["line", "rectangle", "oval"].includes(selectedTool) &&
          startPointRef.current &&
          lastImageRef.current
        ) {
          // Restore the canvas state before drawing the new preview
          contextRef.current.putImageData(lastImageRef.current, 0, 0);

          // Set up context for shape drawing
          contextRef.current.globalCompositeOperation = "source-over";
          if (patternRef.current) {
            const pattern = contextRef.current.createPattern(
              patternRef.current,
              "repeat"
            );
            if (pattern) {
              contextRef.current.strokeStyle = pattern;
            }
          }

          // Draw the preview shape
          contextRef.current.beginPath();

          if (selectedTool === "line") {
            contextRef.current.moveTo(
              startPointRef.current.x,
              startPointRef.current.y
            );
            contextRef.current.lineTo(point.x, point.y);
          } else if (selectedTool === "rectangle") {
            const width = point.x - startPointRef.current.x;
            const height = point.y - startPointRef.current.y;
            contextRef.current.rect(
              startPointRef.current.x,
              startPointRef.current.y,
              width,
              height
            );
          } else if (selectedTool === "oval") {
            const centerX = (startPointRef.current.x + point.x) / 2;
            const centerY = (startPointRef.current.y + point.y) / 2;
            const radiusX = Math.abs(point.x - startPointRef.current.x) / 2;
            const radiusY = Math.abs(point.y - startPointRef.current.y) / 2;

            // Draw ellipse
            contextRef.current.ellipse(
              centerX,
              centerY,
              radiusX,
              radiusY,
              0,
              0,
              2 * Math.PI
            );
          }

          contextRef.current.stroke();
        } else if (!["line", "rectangle", "oval"].includes(selectedTool)) {
          contextRef.current.lineTo(point.x, point.y);
          contextRef.current.stroke();

          // For touch events, save history more frequently to ensure smoother undo/redo
          if (
            "touches" in event &&
            !["line", "rectangle", "oval"].includes(selectedTool)
          ) {
            saveToHistory();
          }
        }
      },
      [
        selectedTool,
        isDraggingSelection,
        selection,
        setSelection,
        saveToHistory,
      ]
    );

    const stopDrawing = useCallback(
      (
        event:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>
      ) => {
        const canvas = canvasRef.current;
        if (!canvas || !contextRef.current) return;

        const point = getCanvasPoint(event);

        // Always save history for touch events that modified the canvas
        if ("touches" in event) {
          if (selectedTool === "bucket" || isDrawing.current) {
            saveToHistory();
          }
        }

        touchStartRef.current = null;

        // Handle selection completion
        if (selectedTool === "rect-select" && startPointRef.current) {
          const width = point.x - startPointRef.current.x;
          const height = point.y - startPointRef.current.y;

          const startX = Math.min(point.x, startPointRef.current.x);
          const startY = Math.min(point.y, startPointRef.current.y);
          const absWidth = Math.abs(width);
          const absHeight = Math.abs(height);

          // Only set selection if there's an actual area selected
          if (absWidth > 0 && absHeight > 0) {
            // Restore the canvas state before capturing selection
            if (lastImageRef.current) {
              contextRef.current.putImageData(lastImageRef.current, 0, 0);
            }

            // Store selection data
            const selectionImageData = contextRef.current.getImageData(
              startX,
              startY,
              absWidth,
              absHeight
            );

            setSelection({
              startX,
              startY,
              width: absWidth,
              height: absHeight,
              imageData: selectionImageData,
            });
          } else {
            // If no selection was made, restore the canvas state
            if (lastImageRef.current) {
              contextRef.current.putImageData(lastImageRef.current, 0, 0);
            }
            setSelection(null);
          }
        }

        // Reset dragging state
        if (isDraggingSelection) {
          setIsDraggingSelection(false);
          dragStartRef.current = null;
          saveToHistory();
        }

        isDrawing.current = false;
        startPointRef.current = null;

        // Reset composite operation after erasing
        if (contextRef.current && selectedTool === "eraser") {
          contextRef.current.globalCompositeOperation = "source-over";
          // Restore pattern
          if (patternRef.current) {
            const pattern = contextRef.current.createPattern(
              patternRef.current,
              "repeat"
            );
            if (pattern) {
              contextRef.current.strokeStyle = pattern;
            }
          }
        }

        // Save history for all drawing operations when they complete
        if (
          isDrawing.current &&
          !isDraggingSelection &&
          selectedTool !== "rect-select"
        ) {
          saveToHistory();
        }

        // Also save history for shape tools when they complete
        if (
          ["line", "rectangle", "oval"].includes(selectedTool) &&
          startPointRef.current &&
          lastImageRef.current
        ) {
          saveToHistory();
        }
      },
      [
        selectedTool,
        isDraggingSelection,
        setSelection,
        setIsDraggingSelection,
        saveToHistory,
      ]
    );

    // Unified pointer event handlers
    const handlePointerDown = useCallback(
      (
        event:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>
      ) => {
        event.preventDefault();
        startDrawing(event);
      },
      [startDrawing]
    );

    const handlePointerMove = useCallback(
      (
        event:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>
      ) => {
        event.preventDefault();
        draw(event);
      },
      [draw]
    );

    const handlePointerUp = useCallback(
      (
        event:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>
      ) => {
        event.preventDefault();
        stopDrawing(event);
      },
      [stopDrawing]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const touchStartHandler = (e: TouchEvent) =>
        handlePointerDown(e as unknown as React.TouchEvent<HTMLCanvasElement>);
      const touchMoveHandler = (e: TouchEvent) =>
        handlePointerMove(e as unknown as React.TouchEvent<HTMLCanvasElement>);
      const touchEndHandler = (e: TouchEvent) =>
        handlePointerUp(e as unknown as React.TouchEvent<HTMLCanvasElement>);

      canvas.addEventListener("touchstart", touchStartHandler, {
        passive: false,
      });
      canvas.addEventListener("touchmove", touchMoveHandler, {
        passive: false,
      });
      canvas.addEventListener("touchend", touchEndHandler, {
        passive: false,
      });

      return () => {
        canvas.removeEventListener("touchstart", touchStartHandler);
        canvas.removeEventListener("touchmove", touchMoveHandler);
        canvas.removeEventListener("touchend", touchEndHandler);
      };
    }, [handlePointerDown, handlePointerMove, handlePointerUp]);

    return (
      <div className="relative w-full h-full overflow-hidden">
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div
            className="relative w-full h-full"
            style={{ aspectRatio: "4/3" }}
          >
            <canvas
              ref={canvasRef}
              style={{
                imageRendering: "pixelated",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                touchAction: "none", // Prevent default touch actions like scrolling
              }}
              className={`${
                selectedTool === "rect-select"
                  ? "cursor-crosshair"
                  : selection
                  ? "cursor-move"
                  : "cursor-crosshair"
              }`}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
            />
            {isTyping && textPosition && (
              <input
                ref={textInputRef}
                type="text"
                className="absolute bg-transparent border-none outline-none font-['Geneva-12'] antialiased text-black pointer-events-auto"
                style={{
                  left: `${textPosition.x}px`,
                  top: `${textPosition.y}px`,
                  fontSize: `16px`,
                  minWidth: "100px",
                  padding: 0,
                  margin: 0,
                  transform: "translateZ(0)",
                }}
                onKeyDown={handleTextInput}
                onBlur={handleTextBlur}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);
