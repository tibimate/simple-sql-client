import { Link, useLocation, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { icons, LayoutDashboard } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { getCurrentTheme, setTheme } from "@/actions/theme";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Connection, ConnectionType } from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";
import type { ThemeMode } from "@/types/theme-mode";
import { AddConnectionDialog } from "./add-connection-dialog";
import { EditConnectionDialog } from "./edit-connection-dialog";
import { Button } from "./ui/button";

interface NavigationGroup {
  groupTitle: string;
  type: ConnectionType;
  items: NavigationItem[];
  icon: React.ReactNode;
}

interface NavigationItem {
  id: string;
  to: string;
  title: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ConnectionType>("postgres");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isThemeLoading, setIsThemeLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConnection, setDeletingConnection] =
    useState<Connection | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const data = await ipc.client.connections.getAll();
      setConnections(data);
    } catch (error) {
      console.error("Failed to load connections:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { local } = await getCurrentTheme();
        setThemeMode(local ?? "system");
      } catch (error) {
        console.error("Failed to load theme:", error);
      } finally {
        setIsThemeLoading(false);
      }
    };

    loadTheme();
  }, []);

  const handleAddConnection = (type: ConnectionType) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  const handleConnectionAdded = (connection: Connection) => {
    loadConnections();
    // Navigate to the newly created connection
    router.navigate({
      to: `/${connection.type}/$id`,
      params: { id: connection.id },
    });
  };

  const handleConnectionUpdated = () => {
    loadConnections();
  };

  const handleEditConnection = (connection: Connection) => {
    setEditingConnection(connection);
    setEditDialogOpen(true);
  };

  const handleDeleteConnection = (connection: Connection) => {
    setDeletingConnection(connection);
    setDeleteDialogOpen(true);
  };

  const handleThemeChange = async (value: string) => {
    if (!value) {
      return;
    }

    const mode = value as ThemeMode;
    setThemeMode(mode);

    try {
      await setTheme(mode);
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  const confirmDeleteConnection = async () => {
    if (!deletingConnection) {
      return;
    }

    try {
      await ipc.client.connections.delete({ id: deletingConnection.id });
      await loadConnections();
    } catch (error) {
      console.error("Failed to delete connection:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingConnection(null);
    }
  };

  const groupedConnections: NavigationGroup[] = [
    {
      groupTitle: "Postgres",
      icon: <PostgresqlIcon size={15} />,
      type: "postgres",
      items: connections
        .filter((conn) => conn.type === "postgres")
        .map((conn) => ({
          id: conn.id,
          to: `/postgres/${conn.id}`,
          title: conn.name,
        })),
    },
    {
      groupTitle: "MySQL",
      icon: <MysqlIcon size={15} />,
      type: "mysql",
      items: connections
        .filter((conn) => conn.type === "mysql")
        .map((conn) => ({
          id: conn.id,
          to: `/mysql/${conn.id}`,
          title: conn.name,
        })),
    },
    {
      groupTitle: "SQLite",
      type: "sqlite",
      icon: <SqlIcon size={15} />,
      items: connections
        .filter((conn) => conn.type === "sqlite")
        .map((conn) => ({
          id: conn.id,
          to: `/sqlite/${conn.id}`,
          title: conn.name,
        })),
    },
  ];

  return (
    <>
      <Sidebar
        {...props}
        className="border-r-zinc-200 bg-zinc-100 pt-9 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <SidebarContent className="flex flex-col px-1">
          <SidebarGroup className="mb-3 px-0">
            <SidebarGroupLabel className="px-0">
              <Link
                className={clsx(
                  "flex w-full items-center gap-2 rounded bg-gray-200 px-3 py-2 text-zinc-800 shadow hover:bg-primary/10 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-zinc-300",
                  location.pathname === "/"
                    ? "bg-primary/10 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    : "hover:bg-primary/10 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                )}
                to="/"
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </SidebarGroupLabel>
          </SidebarGroup>
          {groupedConnections.map((group) => (
            <SidebarGroup
              className="mb-1 rounded bg-white shadow dark:bg-zinc-800"
              key={group.groupTitle}
            >
              <SidebarGroupLabel className="flex items-center justify-between font-bold uppercase">
                <Link
                  className="flex items-center gap-2 transition-opacity hover:opacity-75"
                  to={`/${group.type}`}
                >
                  {group.icon}
                  {group.groupTitle}
                </Link>
                <Button
                  className="text-zinc-800 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-300"
                  onClick={() => handleAddConnection(group.type)}
                  size="icon"
                  variant="ghost"
                >
                  <icons.Plus className="h-4 w-4" />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {(() => {
                    if (isLoading) {
                      return (
                        <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                          Loading...
                        </div>
                      );
                    }

                    if (group.items.length === 0) {
                      return (
                        <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                          No connections found.
                        </div>
                      );
                    }

                    return group.items.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            className={`pr-12 hover:bg-primary/10 hover:text-zinc-700 dark:hover:text-zinc-100 ${
                              isActive
                                ? "bg-primary/10 text-zinc-800 dark:text-zinc-200"
                                : "text-zinc-800 dark:text-zinc-300"
                            }`}
                            tooltip={item.title}
                          >
                            <Link to={item.to}>
                              <icons.Database className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          <div className="absolute top-1.5 right-1 flex gap-1 opacity-0 transition-opacity group-hover/menu-item:opacity-100">
                            <Button
                              aria-label={`Edit ${item.title}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                const connection = connections.find(
                                  (conn) => conn.id === item.id
                                );
                                if (connection) {
                                  handleEditConnection(connection);
                                }
                              }}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <icons.Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              aria-label={`Delete ${item.title}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                const connection = connections.find(
                                  (conn) => conn.id === item.id
                                );
                                if (connection) {
                                  handleDeleteConnection(connection);
                                }
                              }}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <icons.Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </SidebarMenuItem>
                      );
                    });
                  })()}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="px-3 pb-4">
          <ToggleGroup
            aria-label="Theme mode"
            className="w-full"
            disabled={isThemeLoading}
            onValueChange={handleThemeChange}
            size="sm"
            type="single"
            value={themeMode}
            variant="outline"
          >
            <ToggleGroupItem className="flex-1" value="light">
              <icons.Sun className="h-3.5 w-3.5" />
              Light
            </ToggleGroupItem>
            <ToggleGroupItem className="flex-1" value="dark">
              <icons.Moon className="h-3.5 w-3.5" />
              Dark
            </ToggleGroupItem>
            <ToggleGroupItem className="flex-1" value="system">
              <icons.Monitor className="h-3.5 w-3.5" />
              System
            </ToggleGroupItem>
          </ToggleGroup>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AddConnectionDialog
        connectionType={selectedType}
        onConnectionAdded={handleConnectionAdded}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
      <EditConnectionDialog
        connection={editingConnection}
        onConnectionUpdated={handleConnectionUpdated}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingConnection(null);
          }
        }}
        open={editDialogOpen}
      />
      <AlertDialog
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeletingConnection(null);
          }
        }}
        open={deleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingConnection
                ? `Are you sure you want to delete "${deletingConnection.name}"? This action cannot be undone.`
                : "Are you sure you want to delete this connection?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteConnection}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
const PostgresqlIcon = ({
  size = 15,
  color = "inherit",
  strokeWidth = 2,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
}) => {
  const transforms: string[] = [];
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`);
  }
  if (flipHorizontal) {
    transforms.push("scaleX(-1)");
  }
  if (flipVertical) {
    transforms.push("scaleY(-1)");
  }

  const viewBoxSize = 24 + padding * 2;
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={{
        opacity,
        transform: transforms.join(" ") || undefined,
        filter:
          shadow > 0
            ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))`
            : undefined,
        backgroundColor: background !== "transparent" ? background : undefined,
      }}
      viewBox={viewBox}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>PostgreSQL</title>
      <path
        d="M23.56 14.723a.5.5 0 0 0-.057-.12q-.21-.395-1.007-.231c-1.654.34-2.294.13-2.526-.02c1.342-2.048 2.445-4.522 3.041-6.83c.272-1.05.798-3.523.122-4.73a1.6 1.6 0 0 0-.15-.236C21.693.91 19.8.025 17.51.001c-1.495-.016-2.77.346-3.116.479a10 10 0 0 0-.516-.082a8 8 0 0 0-1.312-.127c-1.182-.019-2.203.264-3.05.84C8.66.79 4.729-.534 2.296 1.19C.935 2.153.309 3.873.43 6.304c.041.818.507 3.334 1.243 5.744q.69 2.26 1.433 3.582q.83 1.493 1.714 1.79c.448.148 1.133.143 1.858-.729a56 56 0 0 1 1.945-2.206c.435.235.906.362 1.39.377v.004a11 11 0 0 0-.247.305c-.339.43-.41.52-1.5.745c-.31.064-1.134.233-1.146.811a.6.6 0 0 0 .091.327c.227.423.922.61 1.015.633c1.335.333 2.505.092 3.372-.679c-.017 2.231.077 4.418.345 5.088c.221.553.762 1.904 2.47 1.904q.375.001.829-.094c1.782-.382 2.556-1.17 2.855-2.906c.15-.87.402-2.875.539-4.101c.017-.07.036-.12.057-.136c0 0 .07-.048.427.03l.044.007l.254.022l.015.001c.847.039 1.911-.142 2.531-.43c.644-.3 1.806-1.033 1.595-1.67M2.37 11.876c-.744-2.435-1.178-4.885-1.212-5.571c-.109-2.172.417-3.683 1.562-4.493c1.837-1.299 4.84-.54 6.108-.13l-.01.01C6.795 3.734 6.843 7.226 6.85 7.44c0 .082.006.199.016.36c.034.586.1 1.68-.074 2.918c-.16 1.15.194 2.276.973 3.089q.12.126.252.237c-.347.371-1.1 1.193-1.903 2.158c-.568.682-.96.551-1.088.508c-.392-.13-.813-.587-1.239-1.322c-.48-.839-.963-2.032-1.415-3.512m6.007 5.088a1.6 1.6 0 0 1-.432-.178c.089-.039.237-.09.483-.14c1.284-.265 1.482-.451 1.915-1a8 8 0 0 1 .367-.443a.4.4 0 0 0 .074-.13c.17-.151.272-.11.436-.042c.156.065.308.26.37.475c.03.102.062.295-.045.445c-.904 1.266-2.222 1.25-3.168 1.013m2.094-3.988l-.052.14c-.133.357-.257.689-.334 1.004c-.667-.002-1.317-.288-1.81-.803c-.628-.655-.913-1.566-.783-2.5c.183-1.308.116-2.447.08-3.059l-.013-.22c.296-.262 1.666-.996 2.643-.772c.446.102.718.406.83.928c.585 2.704.078 3.83-.33 4.736a9 9 0 0 0-.23.546m7.364 4.572q-.024.266-.062.596l-.146.438a.4.4 0 0 0-.018.108c-.006.475-.054.649-.115.87a4.8 4.8 0 0 0-.18 1.057c-.11 1.414-.878 2.227-2.417 2.556c-1.515.325-1.784-.496-2.02-1.221a7 7 0 0 0-.078-.227c-.215-.586-.19-1.412-.157-2.555c.016-.561-.025-1.901-.33-2.646q.006-.44.019-.892a.4.4 0 0 0-.016-.113a2 2 0 0 0-.044-.208c-.122-.428-.42-.786-.78-.935c-.142-.059-.403-.167-.717-.087c.067-.276.183-.587.309-.925l.053-.142c.06-.16.134-.325.213-.5c.426-.948 1.01-2.246.376-5.178c-.237-1.098-1.03-1.634-2.232-1.51c-.72.075-1.38.366-1.709.532a6 6 0 0 0-.196.104c.092-1.106.439-3.174 1.736-4.482a4 4 0 0 1 .303-.276a.35.35 0 0 0 .145-.064c.752-.57 1.695-.85 2.802-.833q.616.01 1.174.081c1.94.355 3.244 1.447 4.036 2.383c.814.962 1.255 1.931 1.431 2.454c-1.323-.134-2.223.127-2.68.78c-.992 1.418.544 4.172 1.282 5.496c.135.242.252.452.289.54c.24.583.551.972.778 1.256c.07.087.138.171.189.245c-.4.116-1.12.383-1.055 1.717a35 35 0 0 1-.084.815c-.046.208-.07.46-.1.766m.89-1.621c-.04-.832.27-.919.597-1.01l.135-.041a1 1 0 0 0 .134.103c.57.376 1.583.421 3.007.134c-.202.177-.519.4-.953.601c-.41.19-1.096.333-1.747.364c-.72.034-1.086-.08-1.173-.151m.57-9.271a7 7 0 0 1-.105 1.001c-.055.358-.112.728-.127 1.177c-.014.436.04.89.093 1.33c.107.887.216 1.8-.207 2.701a4 4 0 0 1-.188-.385a8 8 0 0 0-.325-.617c-.616-1.104-2.057-3.69-1.32-4.744c.38-.543 1.342-.566 2.179-.463m.228 7.013l-.085-.107l-.035-.044c.726-1.2.584-2.387.457-3.439c-.052-.432-.1-.84-.088-1.222c.013-.407.066-.755.118-1.092c.064-.415.13-.844.111-1.35a.6.6 0 0 0 .012-.19c-.046-.486-.6-1.938-1.73-3.253a7.8 7.8 0 0 0-2.688-2.04A9.3 9.3 0 0 1 17.62.746c2.052.046 3.675.814 4.824 2.283a1 1 0 0 1 .067.1c.723 1.356-.276 6.275-2.987 10.54m-8.816-6.116c-.025.18-.31.423-.621.423l-.081-.006a.8.8 0 0 1-.506-.315c-.046-.06-.12-.178-.106-.285a.22.22 0 0 1 .093-.149c.118-.089.352-.122.61-.086c.316.044.642.193.61.418m7.93-.411c.011.08-.049.2-.153.31a.72.72 0 0 1-.408.223l-.075.005c-.293 0-.541-.234-.56-.371c-.024-.177.264-.31.56-.352c.298-.042.612.009.636.185"
        fill="currentColor"
      />
    </svg>
  );
};

const MysqlIcon = ({
  size = 10,
  color = "inherit",
  strokeWidth = 2,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
}) => {
  const transforms: string[] = [];
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`);
  }
  if (flipHorizontal) {
    transforms.push("scaleX(-1)");
  }
  if (flipVertical) {
    transforms.push("scaleY(-1)");
  }

  const viewBoxSize = 24 + padding * 2;
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={{
        opacity,
        transform: transforms.join(" ") || undefined,
        filter:
          shadow > 0
            ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))`
            : undefined,
        backgroundColor: background !== "transparent" ? background : undefined,
      }}
      viewBox={viewBox}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>MySQL</title>
      <path
        clipRule="evenodd"
        d="M20.422 17.337c-1.088-.03-1.932.081-2.64.379c-.203.082-.53.082-.557.338c.11.108.122.284.218.433c.163.27.449.635.707.824l.87.622c.531.325 1.13.514 1.647.838c.299.19.598.433.898.636c.152.108.244.284.435.352v-.041c-.095-.122-.123-.297-.217-.433l-.409-.392a6.4 6.4 0 0 0-1.415-1.365c-.435-.298-1.387-.703-1.564-1.203l-.027-.03c.299-.03.653-.136.939-.217c.463-.121.884-.095 1.36-.216l.653-.19v-.12c-.245-.244-.422-.569-.68-.798a18 18 0 0 0-2.245-1.663c-.422-.27-.966-.447-1.415-.676c-.164-.081-.435-.122-.53-.257c-.246-.297-.381-.69-.558-1.041l-1.116-2.353c-.245-.527-.395-1.054-.694-1.54c-1.4-2.3-2.925-3.692-5.265-5.058c-.503-.284-1.101-.406-1.738-.554l-1.02-.055c-.218-.094-.436-.351-.626-.473c-.775-.487-2.775-1.541-3.347-.151c-.368.878.544 1.743.854 2.19c.231.31.53.662.694 1.014c.091.23.122.473.217.716c.218.595.422 1.258.708 1.812c.152.284.312.582.503.839c.109.151.3.216.34.46c-.19.27-.204.675-.313 1.014c-.49 1.528-.3 3.42.395 4.545c.218.338.731 1.082 1.428.798c.613-.244.476-1.014.653-1.69c.041-.162.014-.27.095-.379v.03l.558 1.123c.422.662 1.157 1.352 1.769 1.812c.326.243.584.662.992.81v-.04h-.026c-.082-.121-.205-.176-.314-.27a6.6 6.6 0 0 1-.707-.812a17.4 17.4 0 0 1-1.523-2.46c-.218-.42-.409-.879-.585-1.298c-.083-.162-.083-.406-.218-.487c-.205.297-.503.555-.654.92c-.258.58-.285 1.297-.38 2.041c-.055.014-.03 0-.055.03c-.435-.107-.585-.554-.748-.932c-.408-.96-.476-2.501-.123-3.61c.096-.284.504-1.177.341-1.447c-.082-.257-.354-.405-.504-.608a5.5 5.5 0 0 1-.49-.865c-.325-.758-.489-1.596-.843-2.353c-.163-.352-.449-.717-.68-1.041c-.259-.365-.544-.622-.748-1.055c-.068-.151-.163-.392-.054-.554c.026-.108.081-.152.19-.176c.176-.151.68.04.857.121c.503.203.925.392 1.347.676c.19.135.394.392.64.46h.285c.436.095.925.03 1.333.152c.72.23 1.374.567 1.96.933a12 12 0 0 1 4.244 4.624c.163.311.23.595.38.92c.287.662.64 1.338.926 1.987c.286.636.558 1.285.966 1.812c.204.284 1.02.433 1.387.582c.272.12.694.23.94.378c.461.284.924.609 1.359.92c.217.162.898.5.939.77zM6.548 5.588a2.2 2.2 0 0 0-.557.068v.03h.027c.109.216.3.365.435.555l.313.649l.027-.03c.19-.136.286-.352.286-.676c-.082-.095-.095-.19-.163-.284c-.082-.135-.259-.203-.368-.311"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

const SqlIcon = ({
  size = 15,
  color = "inherit",
  strokeWidth = 2,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
}) => {
  const transforms: string[] = [];
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`);
  }
  if (flipHorizontal) {
    transforms.push("scaleX(-1)");
  }
  if (flipVertical) {
    transforms.push("scaleY(-1)");
  }

  const viewBoxSize = 24 + padding * 2;
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={{
        opacity,
        transform: transforms.join(" ") || undefined,
        filter:
          shadow > 0
            ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))`
            : undefined,
        backgroundColor: background !== "transparent" ? background : undefined,
      }}
      viewBox={viewBox}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>SQLite</title>
      <path
        d="M12 8a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0v-4a2 2 0 0 1 2-2m5 0v8h4m-8-1l1 1M3 15a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};
